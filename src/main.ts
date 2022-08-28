import { fromEvent, interval, merge, Observable, ObservableInput, partition, range } from "rxjs";
import { filter, map, reduce, scan, takeUntil, take, takeWhile, mergeMap, toArray } from "rxjs/operators"
import "./style.css";

function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  const frog = document.createElementNS(svg.namespaceURI, "circle");
  Object.entries({
    cx: 300,
    cy: 580,
    r: 10,
    fill: "white",
  }).forEach(([key, val]) => frog.setAttribute(key, String(val)));
  svg.appendChild(frog);

  type Key = 'w' | 'a' | 's' | 'd'
  type Event = 'keydown' | 'keyup'

  class Tick {constructor(public readonly elapsed: number) {} }
  class Move {constructor(public readonly x: number, public readonly y: number, public readonly addScore: boolean) {}}
  class CreateCar {constructor(public readonly row_no: number, public readonly direction: number, public readonly speed: number) {}}

  type Action = Tick | Move | CreateCar

  const gameClock = interval(10).pipe(map(elapsed => new Tick(elapsed)))
  // const keyObservable = <T>(eventName: Event, k: Key, result: () => T) => 
  //           fromEvent<KeyboardEvent>(document, eventName).pipe(
  //             filter(({key}) => key === k),
  //             filter(({repeat})=>!repeat),
  //             map(result)
  //           )

  type Pos = {
    x: number, y: number
  }

  type Body = Frog | Car

  type Frog = Readonly<{
    id: string,
    pos: Pos,
    createTime: number,
    radius: number
  }>

  type Car = Readonly<{
    id: string,
    pos: Pos,
    createTime: number,
    radius: number,
    direction: number,
    speed: number
  }>

  type State = Readonly<{
    time: number,
    frog: Body
    cars: ReadonlyArray<Car>
    objCount: number
    score: number
    gameOver: boolean
  }>

  const initialState: State = {
    time: 0,
    frog: createFrog(),
    cars: [],
    objCount: 0,
    score: 0,
    gameOver: false
  }

  function createFrog(): Frog {
    return {
      id: 'frog',
      pos: {x: 300, y: 580},
      createTime: 0,
      radius: 10
    }
  }

  function createCar(s: State, row_number: number, direction: number, speed: number): Car {
    return {
      id: `car${s.objCount}`,
      pos: {x: 600 * direction, y: 290 + row_number * 40},
      createTime: s.time,
      radius: 10,
      direction: direction,
      speed: speed
    }
  }

  const moveObj = (o: Car, direction: number, speed: number) => <Car>{...o,
    pos: {x: direction === 1 ? wrap(o.pos.x - speed) : wrap(o.pos.x + speed), y: o.pos.y}
  }

  const tick = (s: State, elapsed: number) => {
    return handleCollisions({...s,
      time: elapsed,
      cars: s.cars.map(e => moveObj(e, e.direction, e.speed))
    })
  }

  const handleCollisions = (s: State) => {
    const bodiesCollided = ([frog, obj]: [Body, Body]) => {
      return Math.abs(frog.pos.x - (obj.pos.x + obj.radius)) < frog.radius + obj.radius
          && Math.abs(frog.pos.y - (obj.pos.y + obj.radius)) < frog.radius + obj.radius
    }
    const frogCollided = s.cars.filter(r => bodiesCollided([s.frog, r])).length > 0

    return <State> {
      ...s,
      gameOver: frogCollided
    }
  }

  const randNoOfCars = () => Math.floor(Math.random() * 2) + 2
  const randInterval = () => Math.floor(Math.random() * 1500) + 500
  const randSpeed = () => Math.floor(Math.random() * 3) + 1
  const randDirection = () => Math.floor(Math.random() * 2)

  function recursion(n: number): Observable<CreateCar>[] {
    if (n === 7) {
      return []
    }
    const rowDir = randDirection()
    const rowSpeed = randSpeed()
    return [interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(n, rowDir, rowSpeed)))].concat(recursion(n+1))
  }

  const [row1, row2, row3, row4, row5, row6] = recursion(1)

  const wrap = (x: number) => x < 0 ? x + 600 : x > 600 ? x - 600 : x

  const reduceState = (s: State, e: Action) => 
      e instanceof Move ? {...s,
        frog: {...s.frog, pos: {x: wrap(s.frog.pos.x + e.x), y: s.frog.pos.y + e.y}},
        score: e.addScore ? s.score + 10 : s.score
      } : 
      e instanceof CreateCar ? {...s,
          cars: s.cars.concat([createCar(s, e.row_no, e.direction, e.speed)]),
          objCount: s.objCount + 1
      } :
      tick(s, e.elapsed)

  function updateView(state: State): void {
    const score = document.getElementById("score")!
    score.innerHTML = String(state.score)
    frog.setAttribute("cx", String(state.frog.pos.x))
    frog.setAttribute("cy", String(state.frog.pos.y))
    state.cars.forEach(c => {
        const createCarView = () => {
          const v = document.createElementNS(svg.namespaceURI, "rect");
          v.setAttribute("id",c.id);
          v.classList.add("car")
          svg.appendChild(v)
          return v;
        }
        const v = document.getElementById(c.id) || createCarView();
        v.setAttribute("x", String(c.pos.x))
        v.setAttribute("y", String(c.pos.y))
        v.setAttribute("width", "20");
        v.setAttribute("height", "20");
        v.setAttribute("fill", "white");
    })
    if (state.gameOver) {
      subscription.unsubscribe()
    }
  }

  const controlFrog = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    map(
      ({key}) => {
        if (key === "w") {
          return new Move(0, -40, true)
        }
        else if (key === "a") {
          return new Move(-40, 0, false)
        }
        else if (key === "s") {
          return new Move(0, 40, false)
        }
        else if (key === "d") {
          return new Move(40, 0, false)
        }
        return new Move(0, 0, false)
      }
    )
  )

  const merger: Observable<Action> = merge(
    gameClock, controlFrog, row1, row2, row3, row4, row5, row6
  )
  
  const subscription = merger.pipe(
    scan(reduceState, initialState)
  ).subscribe(updateView)
}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== 'undefined') {
  window.onload = () => {main()};
}
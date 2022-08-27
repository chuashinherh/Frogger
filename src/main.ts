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
  class Move {constructor(public readonly x: number, public readonly y: number) {}}
  class CreateCar {constructor(public readonly row_no: number) {}}

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

  type Body = Readonly<{
    id: string,
    pos: Pos,
    createTime: number,
    radius: number
  }>

  type State = Readonly<{
    time: number,
    frog: Body
    cars: ReadonlyArray<Body>
    objCount: number
    gameOver: boolean
  }>

  const initialState: State = {
    time: 0,
    frog: createFrog(),
    cars: [],
    objCount: 0,
    gameOver: false
  }

  function createFrog(): Body {
    return {
      id: 'frog',
      pos: {x: 300, y: 580},
      createTime: 0,
      radius: 10
    }
  }

  function createCar(s: State, row_number: number): Body {
    return {
      id: `car${s.objCount}`,
      pos: {x: 600, y: 290 + row_number * 40},
      createTime: s.time,
      radius: 10
    }
  }

  const moveObj = (o: Body) => <Body>{...o,
    pos: {x: wrap(o.pos.x - 1), y: o.pos.y}
  }

  const tick = (s: State, elapsed: number) => {
    return handleCollisions({...s,
      time: elapsed,
      cars: s.cars.map(moveObj)
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

  const randNoOfCars = () => Math.floor(Math.random() * 3) + 1
  const randInterval = () => Math.floor(Math.random() * 1500) + 500
  const randSpeed = () => Math.floor(Math.random() * 3) + 1
  const randDirection = () => Math.floor(Math.random() * 2)

  //const row = range(1, 6).pipe(map(e => interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(e)))))

  const row1 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(1)))
  const row2 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(2)))
  const row3 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(3)))
  const row4 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(4)))
  const row5 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(5)))
  const row6 = interval(randInterval()).pipe(take(randNoOfCars()), map(_ => new CreateCar(6)))

  const wrap = (x: number) => x < 0 ? x + 600 : x > 600 ? x - 600 : x

  const reduceState = (s: State, e: Action) => 
      e instanceof Move ? {...s,
        frog: {...s.frog, pos: {x: wrap(s.frog.pos.x + e.x), y: s.frog.pos.y + e.y}}
      } : 
      e instanceof CreateCar ? {...s,
          cars: s.cars.concat([createCar(s, e.row_no)]),
          objCount: s.objCount + 1
      } :
      tick(s, e.elapsed)

  function updateView(state: State): void {
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
          return new Move(0, -40)
        }
        else if (key === "a") {
          return new Move(-40, 0)
        }
        else if (key === "s") {
          return new Move(0, 40)
        }
        else if (key === "d") {
          return new Move(40, 0)
        }
        return new Move(0, 0)
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
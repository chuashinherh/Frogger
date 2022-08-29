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
  class CreatePlank {constructor(public readonly row_no: number, public readonly direction: number, public readonly speed: number, public readonly radiusX: number, 
    public readonly radiusY: number) {}}

  type Action = Tick | Move | CreateCar | CreatePlank

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

  type Body = Frog | Car | Plank

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

  type Plank = Readonly<{
    id: string,
    pos: Pos,
    createTime: number,
    radiusX: number,
    radiusY: number,
    direction: number,
    speed: number
  }>

  type River = Readonly<{
    id: string,
    pos: Pos,
    createTime: number,
    radiusX: number,
    radiusY: number
  }>

  type State = Readonly<{
    time: number,
    frog: Frog,
    cars: ReadonlyArray<Car>,
    planks: ReadonlyArray<Plank>,
    river: River,
    carCount: number,
    plankCount: number,
    score: number,
    frogOnPlank: Plank[],
    gameOver: boolean
  }>

  const initialState: State = {
    time: 0,
    frog: createFrog(),
    cars: [],
    planks: [],
    river: createRiver(),
    carCount: 0,
    plankCount: 0,
    score: 0,
    frogOnPlank: [],
    gameOver: false
  }

  function createRiver(): River {
    return {
      id: 'river',
      pos: {x: 0, y: 40},
      createTime: 0,
      radiusX: 300,
      radiusY: 120
    }
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
      id: `car${s.carCount}`,
      pos: {x: !direction ? 600 * direction : 600 * direction - 20, 
            y: 290 + row_number * 40},
      createTime: s.time,
      radius: 10,
      direction: direction,
      speed: speed
    }
  }

  function createPlank(s: State, row_number: number, direction: number, speed: number, radiusX: number, radiusY: number): Plank {
    return {
      id: `plank${s.plankCount}`,
      pos: {x: !direction ? 600 * direction : 600 * direction - (radiusX * 2), 
            y: 10 + row_number * 40},
      createTime: s.time,
      radiusX: radiusX,
      radiusY: radiusY,
      direction: direction,
      speed: speed
    }
  }

  const moveCar = (o: Car, direction: number, speed: number) => <Car>{...o,
    pos: {x: direction === 1 ? wrap(o.pos.x - speed, o.radius) : wrap(o.pos.x + speed, o.radius), y: o.pos.y}
  }

  const movePlank = (o: Plank, direction: number, speed: number) => <Plank>{...o,
    pos: {x: direction === 1 ? wrap(o.pos.x - speed, o.radiusX) : wrap(o.pos.x + speed, o.radiusX), y: o.pos.y}
  }

  const moveFrog = (o: Frog, p: Plank, direction: number, speed: number) => <Frog>{...o,
    pos: {x: direction === 1 ? wrapFrogOnPlank(o.pos.x - speed, p.pos.x, o.radius, p.radiusX) : wrapFrogOnPlank(o.pos.x + speed, p.pos.x, o.radius, p.radiusX), y: o.pos.y}
  }

  const wrap = (x: number, radius: number) => x + radius < 0 ? x + 600 : x + radius > 600 ? x - 600 : x

  const wrapFrogOnPlank = (xFrog: number, xPlank: number, radiusFrog: number, radiusPlank: number) => 
      xPlank + radiusPlank < 0 || xFrog + radiusFrog < 0 ? xFrog + 600 : xPlank + radiusPlank > 600 || xFrog + radiusFrog > 600 ? xFrog - 600 : xFrog

  const tick = (s: State, elapsed: number) => {
    return handleCollisions({...s,
      time: elapsed,
      cars: s.cars.map(e => moveCar(e, e.direction, e.speed)),
      planks: s.planks.map(e => movePlank(e, e.direction, e.speed)),
      frog: s.frogOnPlank.length > 0 ? moveFrog(s.frog, s.frogOnPlank[0], s.frogOnPlank[0].direction, s.frogOnPlank[0].speed) : s.frog
    })
  }

  const handleCollisions = (s: State) => {
    const bodiesCollided = ([frog, obj]: [Frog, Car]) => {
      return Math.abs(frog.pos.x - (obj.pos.x + obj.radius)) < frog.radius + obj.radius
          && Math.abs(frog.pos.y - (obj.pos.y + obj.radius)) < frog.radius + obj.radius
    }
    const bodiesCollidedPlank = ([frog, obj]: [Frog, Plank | River]) => {
      return Math.abs(frog.pos.x - (obj.pos.x + obj.radiusX)) < frog.radius + obj.radiusX
          && Math.abs(frog.pos.y - (obj.pos.y + obj.radiusY)) < frog.radius + obj.radiusY
    }
    const frogCollideCar = s.cars.filter(r => bodiesCollided([s.frog, r])).length > 0
    const frogCollidePlank = s.planks.filter(r => bodiesCollidedPlank([s.frog, r]))
    const frogCollideRiver = frogCollidePlank.length > 0 ? false : bodiesCollidedPlank([s.frog, s.river])

    return <State> {
      ...s,
      frogOnPlank: frogCollidePlank,
      gameOver: frogCollideCar || frogCollideRiver
    }
  }

  const randNoOfCars = () => Math.floor(Math.random() * 2) + 2
  const randIntervalCar = () => Math.floor(Math.random() * 1500) + 500
  const randIntervalPlank = () => Math.floor(Math.random() * 3000) + 1500
  const randSpeed = () => Math.floor(Math.random() * 3) + 1
  const randDirection = () => Math.floor(Math.random() * 2)
  const randRadius = () => Math.floor(Math.random() * 30) + 50

  function recursionCar(n: number): Observable<CreateCar>[] {
    if (n === 7) {
      return []
    }
    const rowDirCar = randDirection()
    const rowSpeedCar = randSpeed()
    return [interval(randIntervalCar()).pipe(take(randNoOfCars()), map(_ => new CreateCar(n, rowDirCar, rowSpeedCar)))].concat(recursionCar(n+1))
  }

  const [row1Car, row2Car, row3Car, row4Car, row5Car, row6Car] = recursionCar(1)

  function recursionPlank(n: number): Observable<CreatePlank>[] {
    if (n === 7) {
      return []
    }
    const rowDirPlank = randDirection()
    const rowSpeedPlank = randSpeed()
    const rowRadiusPlank = randRadius()
    return [interval(randIntervalPlank()).pipe(take(randNoOfCars()), map(_ => new CreatePlank(n, rowDirPlank, rowSpeedPlank, rowRadiusPlank, 10)))].concat(recursionPlank(n+1))
  }

  const [row1Plank, row2Plank, row3Plank, row4Plank, row5Plank, row6Plank] = recursionPlank(1)

  const reduceState = (s: State, e: Action) => 
      e instanceof Move ? {...s,
        frog: {...s.frog, pos: {x: wrap(s.frog.pos.x + e.x, s.frog.radius), y: s.frog.pos.y + e.y}},
        score: e.addScore ? s.score + 10 : s.score
      } : 
      e instanceof CreateCar ? {...s,
        cars: s.cars.concat([createCar(s, e.row_no, e.direction, e.speed)]),
        carCount: s.carCount + 1
      } :
      e instanceof CreatePlank ? {...s,
        planks: s.planks.concat([createPlank(s, e.row_no, e.direction, e.speed, e.radiusX, 10)]),
        plankCount: s.plankCount + 1
      } :
      tick(s, e.elapsed)

  function updateView(state: State): void {
    const score = document.getElementById("score")!
    score.innerHTML = String(state.score)
    frog.setAttribute("cx", String(state.frog.pos.x))
    frog.setAttribute("cy", String(state.frog.pos.y))
    svg.appendChild(frog)
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
    state.planks.forEach(p => {
      const createPlankView = () => {
        const v = document.createElementNS(svg.namespaceURI, "rect");
        v.setAttribute("id",p.id);
        v.classList.add("plank")
        svg.appendChild(v)
        return v;
      }
      const v = document.getElementById(p.id) || createPlankView();
      v.setAttribute("x", String(p.pos.x))
      v.setAttribute("y", String(p.pos.y))
      v.setAttribute("width", String(p.radiusX * 2));
      v.setAttribute("height", "20");
      v.setAttribute("fill", "brown");
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
    gameClock, controlFrog, row1Car, row2Car, row3Car, row4Car, row5Car, row6Car,
    row1Plank, row2Plank, row3Plank, row4Plank, row5Plank, row6Plank
  )
  
  const subscription = merger.pipe(
    scan(reduceState, initialState)
  ).subscribe(updateView)
}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== 'undefined') {
  window.onload = () => {main()};
}
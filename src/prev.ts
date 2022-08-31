import { fromEvent, interval, merge, range } from "rxjs";
import { filter, map, reduce, scan, takeUntil, take, takeWhile } from "rxjs/operators"
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

  type State = Readonly<{
    x: number,
    y: number
  }>

  const initialState: State = {
    x: 300, y: 580
  }

  function move(s: State, a: State) {
    return {
      x: s.x + a.x,
      y: s.y + a.y
    }
  }

  function updateView(state: State): void {
    frog.setAttribute("cx", String(state.x))
    frog.setAttribute("cy", String(state.y))
  }

  const controlFrog = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    map(
      ({key}) => {
        if (key === "w") {
          return ({x: 0, y: -40})
        }
        else if (key === "a") {
          return ({x: -40, y: 0})
        }
        else if (key === "s") {
          return ({x: 0, y: 40})
        }
        else if (key === "d") {
          return ({x: 40, y: 0})
        }
        return ({x: 0, y: 0})
      }
    ),
    scan(move, initialState)
  ).subscribe(updateView)

  type GameState = Readonly<{
    cars: Element[]
    gameOver: boolean
  }>

  const gameState: GameState = {
    cars: [],
    gameOver: false
  }

  const createCar = (row_number: number, direction: number) => {
    const car = document.createElementNS(svg.namespaceURI, "rect");
    Object.entries({
      x: 600 * direction,
      y: row_number * 40 + 290,
      width: 20,
      height: 20,
      fill: "white"
    }).forEach(([key, val]) => car.setAttribute(key, String(val)));
    svg.appendChild(car);
    return car
  }
  const addCar = (row_number: number, speed: number, direction: number) => {
    const car = createCar(row_number, direction)
    const bla = () => {
      return {
        cars: [car].reduce((t, e) => t.concat(e), gameState.cars),
        gameOver: false
      }
    }
    // const updateGState = (s: GameState) => {
    //   gameState.cars = s.cars
      
    // }

    const lol = range(1,1).pipe(scan(bla, gameState)).subscribe()
    // gameState.cars.push(car)
    const carState: State = {
      x: 600 * direction, y: row_number * 40 + 290
    }
    const moveCar = (s: State, speed: number) => {
      return {
        x: s.x + speed,
        y: s.y
      }
    }
    const needsWrap = (direction: number) => {
      return direction ? parseInt(String(car.getAttribute("x"))) < 0 : parseInt(String(car.getAttribute("x"))) > 600
    }
    const updateCar = (s: State) => {
      car.setAttribute("x", String(s.x))
      car.setAttribute("y", String(s.y))
    }
    const update = interval(10).pipe(
      takeWhile(_ => !gameState.gameOver),
      map(_ => direction ? 
        !needsWrap(direction) ? -speed : 600 : 
        !needsWrap(direction) ? speed : -600),
      scan(moveCar, carState)
    ).subscribe(updateCar)
  }

  const createMultipleCars = (row_number: number) => {
    const randNoOfCars = Math.floor(Math.random() * 2) + 1
    const randInterval = Math.floor(Math.random() * 1500) + 500
    const randSpeed = Math.floor(Math.random() * 3) + 1
    const randDirection = Math.floor(Math.random() * 2)
    addCar(row_number, randSpeed, randDirection)
    return interval(randInterval).pipe(takeWhile(_ => !gameState.gameOver), take(randNoOfCars)).subscribe(_ => addCar(row_number, randSpeed, randDirection))
  }

  const createMultipleRowCars = () => {
    const randNoOfCars = () => Math.floor(Math.random() * 2) + 1
    const randInterval = () => Math.floor(Math.random() * 1500) + 500
    const randSpeed = () => Math.floor(Math.random() * 3) + 1
    const randDirection = () => Math.floor(Math.random() * 2)
    return range(1, 6).subscribe(e => createMultipleCars(e))
  }

  const test = createMultipleRowCars()

  const handleCollisions = (gameState: GameState) => {
    const bodiesCollided = ([frog, obj]: [Element, Element]) => {
      return (Math.abs(parseInt(String(frog.getAttribute("cx"))) - (parseInt(String(obj.getAttribute("x"))) + (parseInt(String(obj.getAttribute("width"))) / 2))) < parseInt(String(frog.getAttribute("r"))) + (parseInt(String(obj.getAttribute("width"))) / 2)) && 
              (Math.abs(parseInt(String(frog.getAttribute("cy"))) - (parseInt(String(obj.getAttribute("y"))) + (parseInt(String(obj.getAttribute("height"))) / 2))) < parseInt(String(frog.getAttribute("r"))) + (parseInt(String(obj.getAttribute("height"))) / 2))
    }
    const frogCollided = gameState.cars.filter(r => bodiesCollided([frog, r])).length > 0
    //gameState.gameOver = frogCollided
  }

  interval(10).subscribe(_ => {
    handleCollisions(gameState)
    if (gameState.gameOver) {
      controlFrog.unsubscribe()
      console.log("Game Over")
    }
  })
}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== 'undefined') {
  window.onload = () => {main()};
}
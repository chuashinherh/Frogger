/**
 * Frogger
 * @author Chua Shin Herh
 *
 * A game based on the classic arcade game Frogger, implemented using
 * FRP concepts.
 * Functions are pure if not stated otherwise, and side effects are contained
 * as much as possible.
 *
 * Referenced the overall concepts from the Asteroids example from the
 * teaching team. The high level logic of the Model-View-Controller
 * architecture from the Asteroids example is the same, but the specific
 * implementations of most functions are modified to suit this specific game
 * compared to the example.
 */

/**
 * Imports
 *
 * Utilises the RxJS library for using Observables as a method of
 * implementing FRP.
 */
import { fromEvent, interval, merge, Observable, range } from "rxjs";
import { map, scan, take } from "rxjs/operators";
import "./style.css";

/**
 * The main function that starts the game. It is called when the window loads
 * in the browser.
 */
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

  /**
   * The classes below are used for pattern matching below in the
   * reduceState function using instanceof, and also stores some
   * data that these classes need.
   */
  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(
      public readonly x: number,
      public readonly y: number,
      public readonly addScore: boolean
    ) {}
  }
  class CreateCar {
    constructor(
      public readonly row_no: number,
      public readonly direction: number
    ) {}
  }
  class CreatePlank {
    constructor(
      public readonly row_no: number,
      public readonly direction: number,
      public readonly speed: number,
      public readonly radiusX: number,
      public readonly radiusY: number
    ) {}
  }
  class CreateTarget {
    constructor(public readonly n: number) {}
  }
  class CreateCrocodile {
    constructor(
      public readonly row_no: number,
      public readonly direction: number,
      public readonly speed: number,
      public readonly radiusX: number,
      public readonly radiusY: number
    ) {}
  }
  class CreateLadyFrog {
    constructor() {}
  }

  /**
   * Creates a Tick object every 10 milliseconds. The gameClock basically
   * just serves as a clock for the game to progress.
   */
  const gameClock = interval(10).pipe(map((elapsed) => new Tick(elapsed)));

  /**
   * A type used to represent all actions that can be performed in the game
   * such as moving the frog and creating the obstacles.
   * Grouping these actions can help prevent typos when used in reduceState,
   * as we don't need to manually type out all of these actions.
   */
  type Action =
    | Tick
    | Move
    | CreateCar
    | CreatePlank
    | CreateCrocodile
    | CreateLadyFrog;

  /**
   * Represents the position of an object on the canvas. Using a type to
   * represent the position can let us declare the position of every object
   * as a Pos type rather than needing explicit x and y properties for each
   * object.
   */
  type Pos = {
    x: number; // the x value of the object
    y: number; // the y value of the object
  };

  /**
   * The types "Frog", "Car", "Plank", "Crocodile", "Target", and "River"
   * below are all different types rather than a single type "Body" as shown
   * in the Asteroids example. This is because they have different properties
   * and behaviours, so it would be easier to just separate them into
   * different types.
   * They are all marked Readonly to prevent mutation for functional purity.
   */
  type Frog = Readonly<{
    id: string; // an id to identify the frog
    pos: Pos; // the position of the frog
    createTime: number; // the creation time of the frog
    radius: number; // the radius of the frog
  }>;

  type Car = Readonly<{
    id: string; // an id to identify the car
    pos: Pos; // the position of the car
    createTime: number; // the creation time of the car
    radius: number; // the car's width / 2 or height / 2 (since car is a square)
    direction: number; // the direction of the moving car (0 means the car moves from left to right, 1 means the car moves from right to left)
    speed: number; // the speed of the moving car
  }>;

  type Plank = Readonly<{
    id: string; // an id to identify the plank
    pos: Pos; // the position of the plank
    createTime: number; // the creation time of the plank
    radiusX: number; // the plank's width / 2
    radiusY: number; // the plank's height / 2
    direction: number; // the direction of the moving plank (0 means the plank moves from left to right, 1 means the plank moves from right to left)
    speed: number; // the speed of the moving plank
  }>;

  type Crocodile = Readonly<{
    id: string; // an id to identify the crocodile
    pos: Pos; // the position of the crocodile
    createTime: number; // the creation time of the crocodile
    radiusX: number; // the crocodile's width / 2
    radiusY: number; // the crocodile's height / 2
    direction: number; // the direction of the moving crocodile (0 means the crocodile moves from left to right, 1 means the crocodile moves from right to left)
    speed: number; // the speed of the moving crocodile
  }>;

  type Target = Readonly<{
    id: string; // an id to identify the target
    pos: Pos; // the position of the target
    createTime: number; // the creation time of the target
    radius: number; // the target's width / 2 or height / 2 (since target is a square)
  }>;

  type River = Readonly<{
    id: string; // the river's id
    pos: Pos; // the position of the river
    createTime: number; // the creation time of the river
    radiusX: number; // the river's width / 2
    radiusY: number; // the river's height / 2
  }>;

  /**
   * Represents the state of the game at a single point of time.
   * Marked Readonly to prevent mutation for functional purity.
   */
  type State = Readonly<{
    time: number; // the time that has passed at the current state
    frog: Frog; // the frog that the player controls
    ladyFrog: Frog | null; // the lady frog that grants a bonus 200 points to the player
    cars: ReadonlyArray<Car>; // an array of cars that will appear on the map
    planks: ReadonlyArray<Plank>; // an array of planks that will appear on the map
    targets: ReadonlyArray<Target>; // an array of targets that will appear on the map
    crocodile: Crocodile | null; // the crocodile that kills the player when stepped on
    river: River; // the river of the game
    carCount: number; // the number of cars of the current state
    plankCount: number; // the number of planks of the current state
    score: number; // the score of the player at the current state
    highscore: number; // the highscore of the player
    level: number; // the level that the player is currently at
    multiplier: number; // the difficulty multiplier
    carSpeed: ReadonlyArray<number>; // an array of current car speeds for individual rows of cars
    carNum: ReadonlyArray<number>; // an array of the current number of cars for individual rows of cars
    plankNum: ReadonlyArray<number>; // an array of the current number of planks for individual rows of planks
    frogOnPlank: ReadonlyArray<Plank>; // an array of the planks that currently have a frog on it
    ladyFrogOnPlank: ReadonlyArray<Plank>; // an array of the planks that currently have a lady frog on it
    hasFrogTarget: ReadonlyArray<Target>; // an array of the targets that currently have a frog in it
    frogPicksUpLadyFrog: boolean; // a boolean that indicates whether the frog has picked up the lady frog
    frogInTargetCount: number; // a number that indicates how many frog have reached the target
    passedLevel: boolean; // a boolean that indicates whether a level is passed
    gameOver: boolean; // a boolean that indicates whether the game is over
  }>;

  /**
   * Creates a crocodile. The position of the crocodile depends on the
   * direction, row_number, and its width.
   *
   * @param s the current state of the game
   * @param row_number the row of the river where the crocodile will be placed
   * @param direction the direction where the crocodile will move
   * @param speed the speed of the moving crocodile
   * @param radiusX the width of the crocodile
   * @param radiusY the height of the crocodile
   * @returns a Crocodile object
   */
  const createCrocodile =
    (s: State) =>
    (row_number: number) =>
    (direction: number) =>
    (speed: number) =>
    (radiusX: number) =>
    (radiusY: number) =>
      <Crocodile>{
        id: "crocodile",
        pos: {
          x: !direction ? 600 * direction : 600 * direction - radiusX * 2,
          y: 10 + row_number * 40,
        },
        createTime: s.time,
        radiusX: radiusX,
        radiusY: radiusY,
        direction: direction,
        speed: speed,
      };

  /**
   * Creates the river of the game. Used to check whether the frog has fallen
   * into the river.
   *
   * @returns a River object
   */
  const createRiver = () =>
    <River>{
      id: "river",
      pos: { x: 0, y: 40 },
      createTime: 0,
      radiusX: 300,
      radiusY: 120,
    };

  /**
   * Creates a frog. The position of the frog depends on the x and y arguments,
   * and isLadyFrog is used to check whether the frog we want to create is a
   * player controllable frog or the lady frog.
   *
   * @param x the horizontal position of the frog
   * @param y the vertical position of the frog
   * @param isLadyFrog a boolean the checks whether we should create a lady frog
   * @returns a Frog object
   */
  const createFrog = (x: number) => (y: number) => (isLadyFrog: boolean) =>
    <Frog>{
      id: isLadyFrog ? "ladyFrog" : "frog",
      pos: { x: x, y: y },
      createTime: 0,
      radius: 10,
    };

  /**
   * Creates a car. The position of the car depends on the direction
   * and row_number.
   *
   * @param s the current state of the game
   * @param row_number the row of the road where the car will be placed
   * @param direction the direction where the car will move
   * @returns
   */
  const createCar = (s: State) => (row_number: number) => (direction: number) =>
    <Car>{
      id: `car${s.carCount}`,
      pos: {
        x: !direction ? 600 * direction : 600 * direction - 20,
        y: 290 + row_number * 40,
      },
      createTime: s.time,
      radius: 10,
      direction: direction,
      speed: s.carSpeed[row_number - 1] * s.multiplier,
    };

  /**
   * Creates a plank. The position of the plank depends on the
   * direction, row_number, and its width.
   *
   * @param s the current state of the game
   * @param row_number the row of the river where the plank will be placed
   * @param direction the direction where the plank will move
   * @param speed the speed of the moving plank
   * @param radiusX the width of the plank
   * @param radiusY the height of the plank
   * @returns a Plank object
   */
  const createPlank =
    (s: State) =>
    (row_number: number) =>
    (direction: number) =>
    (speed: number) =>
    (radiusX: number) =>
    (radiusY: number) =>
      <Plank>{
        id: `plank${s.plankCount}`,
        pos: {
          x: !direction ? 600 * direction : 600 * direction - radiusX * 2,
          y: 10 + row_number * 40,
        },
        createTime: s.time,
        radiusX: radiusX,
        radiusY: radiusY,
        direction: direction,
        speed: speed,
      };

  /**
   * Creates a target. The position of the target depends on n, which is
   * the number of the target being created.
   *
   * @param n number of the target being created
   * @returns a Target object
   */
  const createTarget = (n: number) =>
    <Target>{
      id: `target${n + 1}`,
      pos: { x: 120 * n + 40, y: 0 },
      createTime: 0,
      radius: 20,
    };

  /**
   * The initial state of the game. This is the state of the game that we will
   * return to whenever the game is restarted.
   */
  const initialState: State = {
    time: 0,
    frog: createFrog(300)(580)(false),
    ladyFrog: null,
    cars: [],
    planks: [],
    targets: [],
    crocodile: null,
    river: createRiver(),
    carCount: 0,
    plankCount: 0,
    score: 0,
    highscore: 0,
    level: 1,
    multiplier: 1.05,
    carSpeed: [1, 1, 1.3, 1, 1, 1],
    carNum: [2, 2, 1, 3, 3, 2],
    plankNum: [2, 3, 4, 2, 3, 3],
    frogOnPlank: [],
    ladyFrogOnPlank: [],
    hasFrogTarget: [],
    frogPicksUpLadyFrog: false,
    frogInTargetCount: 0,
    passedLevel: false,
    gameOver: false,
  };

  /**
   * This function is used to reset the state of the game. It will return
   * the initial state if the game is over, or it will return a new state
   * when a level is complete that changes some properties such as the level
   * and the speed of the cars, to progress to the next level, or return the
   * same state if neither of these events happen.
   *
   * @param s the current state of the game
   * @returns the initial state, a new state, or the current state
   *          depending on if the game is over, or a level is passed,
   *          or neither happens.
   */
  function resetState(s: State): State {
    if (s.gameOver) {
      return {
        ...s,
        time: 0,
        frog: createFrog(300)(580)(false),
        ladyFrog: null,
        cars: [],
        planks: [],
        targets: [],
        crocodile: null,
        river: createRiver(),
        carCount: 0,
        plankCount: 0,
        score: 0,
        level: 1,
        multiplier: 1.05,
        carSpeed: [1, 1, 1.3, 1, 1, 1],
        carNum: [2, 2, 1, 3, 3, 2],
        plankNum: [2, 3, 4, 2, 3, 3],
        frogOnPlank: [],
        ladyFrogOnPlank: [],
        hasFrogTarget: [],
        frogPicksUpLadyFrog: false,
        frogInTargetCount: 0,
        passedLevel: false,
        gameOver: false,
      };
    } else if (s.passedLevel) {
      return {
        ...s,
        frog: createFrog(300)(580)(false),
        ladyFrog: null,
        cars: [],
        planks: [],
        targets: [],
        crocodile: null,
        carCount: 0,
        plankCount: 0,
        level: s.level + 1,
        carSpeed: [
          s.carSpeed[0] * s.multiplier,
          s.carSpeed[1] * s.multiplier,
          s.carSpeed[2] * s.multiplier,
          s.carSpeed[3] * s.multiplier,
          s.carSpeed[4] * s.multiplier,
          s.carSpeed[5] * s.multiplier,
        ],
        carNum:
          s.level === 5
            ? [2 + 1, 2 + 1, 1 + 1, 3 + 1, 3 + 1, 2 + 1]
            : [2, 2, 1, 3, 3, 2],
        plankNum:
          s.level === 5 ? [2, 3, 4 - 1, 2 - 1, 3, 3 - 1] : [2, 3, 4, 2, 3, 3],
        frogOnPlank: [],
        ladyFrogOnPlank: [],
        hasFrogTarget: [],
        frogPicksUpLadyFrog: false,
        frogInTargetCount: 0,
        passedLevel: false,
      };
    }
    return s;
  }

  /**
   * Moves a car across the screen. We can do this by first checking the
   * direction and take the position of the car and either adding speed or
   * subtracting speed depending on the direction.
   *
   * @param o the car that will be moved
   * @param direction the direction of the moving car
   * @param speed the speed of the moving car
   * @returns a Car object
   */
  const moveCar = (o: Car, direction: number, speed: number) =>
    <Car>{
      ...o,
      pos: {
        x:
          direction === 1
            ? wrap(o.pos.x - speed, o.radius)
            : wrap(o.pos.x + speed, o.radius),
        y: o.pos.y,
      },
    };

  /**
   * Moves a plank or a crocodile across the screen. Since the movement
   * logic of a plank and a crocodile is the same, we can use the same
   * function for both of their movements.
   *
   * We can do this by first checking the direction and take the position
   * of the plank or crocodile and either adding speed or subtracting
   * speed depending on the direction.
   *
   * @param o the plank or the crocodile that will be moved
   * @param direction the direction of the moving plank or crocodile
   * @param speed the speed of the moving plank or crocodile
   * @returns a Plank object or a Crocodile object, depending on if the
   *          object passed in is a plank or a crocodile
   */
  const movePlankOrCrocodile = (
    o: Plank | Crocodile,
    direction: number,
    speed: number
  ) =>
    <Plank | Crocodile>{
      ...o,
      pos: {
        x:
          direction === 1
            ? wrapPlank(o.pos.x - speed, o.radiusX)
            : wrapPlank(o.pos.x + speed, o.radiusX),
        y: o.pos.y,
      },
    };

  /**
   * Moves a frog across the screen. This function is to move the frog along
   * with the plank when the frog is on top of a plank. And the logic of this
   * function is different to the movement of the lady frog because the frog
   * doesn't need to wrap around the map.
   *
   * We can do this by first checking the direction and take the position
   * of the frog and either adding speed or subtracting speed depending
   * on the direction.
   *
   * @param o the frog that will be moved
   * @param direction the direction of the moving frog
   * @param speed the speed of the moving frog
   * @returns a Frog object
   */
  const moveFrog = (o: Frog, direction: number, speed: number) =>
    <Frog>{
      ...o,
      pos: {
        x: direction === 1 ? o.pos.x - speed : o.pos.x + speed,
        y: o.pos.y,
      },
    };

  /**
   * Moves the lady frog across the screen. This function doesn't need
   * to check the direction since the lady frog moves in a fixed direction
   * according to my implementation.
   *
   * @param o the lady frog
   * @param speed the speed of the moving lady frog
   * @returns a Frog object
   */
  const moveLadyFrog = (o: Frog, speed: number) =>
    <Frog>{
      ...o,
      pos: { x: wrapLadyFrog(o.pos.x + speed, o.radius), y: o.pos.y },
    };


  /**
   * Wraps an object around the map. This can be done by checking if the
   * horizontal position of the object is less or more than the canvas
   * size, then either adding or subtracting the horizontal position by
   * the canvas size, or returning the position itself if no wrapping is
   * needed.
   * 
   * @param x the horizontal position of the object
   * @param radius the radius or the width/2 of the object, depending on
   *               if it is a circle or rectangle
   * @returns a number representing the updated position
   */
  const wrap = (x: number, radius: number) =>
    x + radius < 0 ? x + 600 : x + radius > 600 ? x - 600 : x;

  /**
   * Wraps the lady frog around the map.
   * 
   * @param x the horizontal position of the lady frog
   * @param radius the radius of the lady frog
   * @returns a number representing the updated position
   */
  const wrapLadyFrog = (x: number, radius: number) =>
    x - radius > 600 ? x - 620 : x;

  /**
   * Wraps a plank around the map.
   * 
   * @param xPlank the horizontal position of the plank
   * @param radiusPlank the plank's width/2
   * @returns a number representing the updated position
   */
  const wrapPlank = (xPlank: number, radiusPlank: number) =>
    xPlank + radiusPlank * 2 < 0
      ? xPlank + 600 + radiusPlank
      : xPlank > 600
      ? xPlank - 600 - radiusPlank
      : xPlank;

  /**
   * Move objects and calls handleCollisions() to handle the moved objects' 
   * collisions on every tick of the game.
   * 
   * @param s the current state of the game
   * @param elapsed the elapsed time
   * @returns a new State with the objects moved and collisions handled
   */
  const tick = (s: State, elapsed: number) => {
    return handleCollisions({
      ...s,
      time: elapsed,
      cars: s.cars.map((e) => moveCar(e, e.direction, e.speed)),
      planks: s.planks.map((e) =>
        movePlankOrCrocodile(e, e.direction, e.speed)
      ),
      frog:
        s.frogOnPlank.length > 0
          ? moveFrog(s.frog, s.frogOnPlank[0].direction, s.frogOnPlank[0].speed)
          : s.frog,
      ladyFrog: s.ladyFrog
        ? s.ladyFrogOnPlank.length > 0
          ? moveLadyFrog(s.ladyFrog!, s.ladyFrogOnPlank[0].speed)
          : s.ladyFrog
        : s.ladyFrog,
      crocodile: s.crocodile
        ? movePlankOrCrocodile(
            s.crocodile,
            s.crocodile.direction,
            s.crocodile.speed
          )
        : s.crocodile,
    });
  };

  /**
   * Handles the collision logic of every object in the game.
   * 
   * @param s the current state of the game
   * @returns a new State with the collisions handled
   */
  const handleCollisions = (s: State) => {
    /**
     * Checks if the frog has collided with a car, a target, or the lady frog.
     * 
     * @param param0 a list containing the frog and either a car, target, or frog
     * @returns a boolean indicating whether the frog has collided
     */
    const frogCollided = ([frog, obj]: [Frog, Car | Target | Frog]) => {
      return (
        Math.abs(frog.pos.x - (obj.pos.x + obj.radius)) <
          frog.radius + obj.radius &&
        Math.abs(frog.pos.y - (obj.pos.y + obj.radius)) <
          frog.radius + obj.radius
      );
    };

    /**
     * Checks if the frog has collided with a plank or the river.
     * 
     * @param param0 a list containing the frog and either a plank or the river
     * @returns a boolean indicating whether the frog has collided
     */
    const frogCollidedPlankOrRiver = ([frog, obj]: [Frog, Plank | River]) => {
      return (
        Math.abs(frog.pos.x - (obj.pos.x + obj.radiusX)) <
          frog.radius + obj.radiusX &&
        Math.abs(frog.pos.y - (obj.pos.y + obj.radiusY)) <
          frog.radius + obj.radiusY
      );
    };

    // Indicates whether the frog collides with any cars
    const frogCollideCar =
      s.cars.filter((r) => frogCollided([s.frog, r])).length > 0;

    // An array that stores the planks that collides with the frog
    const frogCollidePlank = s.planks.filter((r) =>
      frogCollidedPlankOrRiver([s.frog, r])
    );

    // An array that stores the planks that the lady frog is on
    const ladyFrogOnPlank = s.ladyFrog
      ? s.planks.filter((r) => frogCollidedPlankOrRiver([s.ladyFrog!, r]))
      : [];

    // Indicates whether the frog has picked up the lady frog
    const frogPicksUpLadyFrog = s.ladyFrog
      ? frogCollided([s.frog, s.ladyFrog])
      : false;

    // Indicates whether the frog has fell into the river
    const frogCollideRiver =
      frogCollidePlank.length > 0
        ? false
        : frogCollidedPlankOrRiver([s.frog, s.river]);

    // Indicates whether the frog has went out of bounds
    const frogOutOfBounds =
      s.frog.pos.x - s.frog.radius > 600 || s.frog.pos.x + s.frog.radius < 0;

    // An array that stores the targets that contains the frog
    const hasFrogTarget = s.targets.filter((r) => frogCollided([s.frog, r]));

    return <State>{
      ...s,
      frog: hasFrogTarget.length > 0 ? createFrog(300)(580)(false) : s.frog,
      score:
        hasFrogTarget.length > 0 && s.frogPicksUpLadyFrog
          ? s.score + 200 + 50
          : hasFrogTarget.length > 0 && !s.frogPicksUpLadyFrog
          ? s.score + 50
          : s.score,
      highscore:
        hasFrogTarget.length > 0 &&
        s.frogPicksUpLadyFrog &&
        (s.score >= s.highscore || s.score + 200 + 50 >= s.highscore)
          ? s.score + 200 + 50
          : hasFrogTarget.length > 0 &&
            !s.frogPicksUpLadyFrog &&
            (s.score >= s.highscore || s.score + 50 >= s.highscore)
          ? s.score + 50
          : s.highscore,
      hasFrogTarget: hasFrogTarget,
      frogOnPlank: frogCollidePlank,
      ladyFrogOnPlank: ladyFrogOnPlank,
      frogPicksUpLadyFrog: s.frogPicksUpLadyFrog
        ? hasFrogTarget.length > 0
          ? false
          : s.frogPicksUpLadyFrog
        : frogPicksUpLadyFrog,
      frogInTargetCount:
        hasFrogTarget.length > 0
          ? s.frogInTargetCount + 1
          : s.frogInTargetCount,
      passedLevel:
        hasFrogTarget.length > 0 && s.frogInTargetCount + 1 === 5
          ? true
          : false,
      gameOver: frogCollideCar || frogCollideRiver || frogOutOfBounds,
    };
  };

  /**
   * Recursively creates all the targets of the game.
   * 
   * @param n a number indicating the target number
   * @returns an Observable of CreateTarget
   */
  function addTarget(n: number): Observable<CreateTarget>[] {
    if (n === 5) {
      return [];
    }
    return [range(1, 1).pipe(map((_) => new CreateTarget(n)))].concat(
      addTarget(n + 1)
    );
  }
  const [target1, target2, target3, target4, target5] = addTarget(0);

  /**
   * Transforms and reduces the current game state to obtain the game state
   * of the next tick.
   * 
   * This function checks the action passed into the function is an
   * instance of which Action, then performs the appropriate operations
   * on it.
   * 
   * @param s the current state of the game
   * @param e the type of action from the Observable stream
   * @returns a new State obtained from transforming the current state
   */
  const reduceState = (s: State, e: Action) =>
    e instanceof Move
      ? {
          ...s,
          frog: {
            ...s.frog,
            pos: { x: s.frog.pos.x + e.x, y: s.frog.pos.y + e.y },
          },
          score: e.addScore ? s.score + 10 : s.score,
          highscore:
            e.addScore && s.score >= s.highscore
              ? s.highscore + 10
              : s.highscore,
        }
      : e instanceof CreateCar
      ? {
          ...s,
          cars: s.cars.concat([createCar(s)(e.row_no)(e.direction)]),
          carCount: s.carCount + 1,
        }
      : e instanceof CreatePlank
      ? {
          ...s,
          planks: s.planks.concat([
            createPlank(s)(e.row_no)(e.direction)(e.speed)(e.radiusX)(10),
          ]),
          plankCount: s.plankCount + 1,
        }
      : e instanceof CreateTarget
      ? { ...s, targets: s.targets.concat([createTarget(e.n)]) }
      : e instanceof CreateCrocodile
      ? {
          ...s,
          crocodile: createCrocodile(s)(e.row_no)(e.direction)(e.speed)(
            e.radiusX
          )(10),
        }
      : e instanceof CreateLadyFrog
      ? { ...s, ladyFrog: createFrog(40)(220)(true) }
      : tick(s, e.elapsed);

  /**
   * Updates the HTML elements of the svg canvas. This is the only impure
   * function in the code.
   * 
   * @param state the current state of the game
   */
  function updateView(state: State) {
    // update the score and high score
    const frog = document.getElementById("frog")!;
    const score = document.getElementById("score")!;
    score.innerHTML = String(state.score);
    const highscore = document.getElementById("highscore")!;
    highscore.innerHTML = String(state.highscore);

    // add a element to the target if there is a frog at the target,
    // and resets the position of the frog to its initial position.
    if (state.hasFrogTarget.length > 0) {
      const frogAtTarget = document.createElementNS(svg.namespaceURI, "circle");
      Object.entries({
        id: `frg${state.frogInTargetCount}`,
        cx: state.hasFrogTarget[0].pos.x + state.hasFrogTarget[0].radius,
        cy: state.hasFrogTarget[0].pos.y + state.hasFrogTarget[0].radius,
        r: 10,
        fill: "white",
      }).forEach(([key, val]) => frogAtTarget.setAttribute(key, String(val)));
      svg.appendChild(frogAtTarget);
      frog.setAttribute("cx", String(300));
      frog.setAttribute("cy", String(580));
    } else {
      frog.setAttribute("cx", String(state.frog.pos.x));
      frog.setAttribute("cy", String(state.frog.pos.y));
    }
    svg.appendChild(frog);

    // update the position of every car
    state.cars.forEach((c) => {
      const createCarView = () => {
        const v = document.createElementNS(svg.namespaceURI, "rect");
        v.setAttribute("id", c.id);
        v.classList.add("car");
        svg.appendChild(v);
        return v;
      };
      const v = document.getElementById(c.id) || createCarView();
      v.setAttribute("x", String(c.pos.x));
      v.setAttribute("y", String(c.pos.y));
      v.setAttribute("width", "20");
      v.setAttribute("height", "20");
      v.setAttribute("fill", "white");
    });

    // update the position of every plank
    state.planks.forEach((p) => {
      const createPlankView = () => {
        const v = document.createElementNS(svg.namespaceURI, "rect");
        v.setAttribute("id", p.id);
        v.classList.add("plank");
        svg.appendChild(v);
        return v;
      };
      const v = document.getElementById(p.id) || createPlankView();
      v.setAttribute("x", String(p.pos.x));
      v.setAttribute("y", String(p.pos.y));
      v.setAttribute("width", String(p.radiusX * 2));
      v.setAttribute("height", "20");
      v.setAttribute("fill", "brown");
    });

    // update position of the crocodile
    if (state.crocodile) {
      const createCrocView = () => {
        const croc = document.createElementNS(svg.namespaceURI, "rect");
        croc.setAttribute("id", "croc");
        svg.appendChild(croc);
        return croc;
      };
      const croc = document.getElementById("croc") || createCrocView();
      croc.setAttribute("x", String(state.crocodile!.pos.x));
      croc.setAttribute("y", String(state.crocodile!.pos.y));
      croc.setAttribute("width", String(state.crocodile!.radiusX * 2));
      croc.setAttribute("height", "20");
      croc.setAttribute("fill", "yellow");
    }

    // update position of the lady frog
    if (state.ladyFrog) {
      const createLadyFrogView = () => {
        const ladyFrog = document.createElementNS(svg.namespaceURI, "circle");
        ladyFrog.setAttribute("id", "ladyFrog");
        svg.appendChild(ladyFrog);
        return ladyFrog;
      };
      if (!state.frogPicksUpLadyFrog) {
        const ladyFrog =
          document.getElementById("ladyFrog") || createLadyFrogView();
        ladyFrog.setAttribute("cx", String(state.ladyFrog!.pos.x));
        ladyFrog.setAttribute("cy", String(state.ladyFrog!.pos.y));
        ladyFrog.setAttribute("r", String(state.ladyFrog!.radius));
        ladyFrog.setAttribute("fill", "pink");
      } else {
        const ladyFrog = document.getElementById("ladyFrog");
        if (ladyFrog) {
          svg.removeChild(ladyFrog);
        }
      }
    }

    // clears the canvas when the game is restarted
    function clearView() {
      state.cars.forEach((c) => {
        svg.removeChild(document.getElementById(c.id)!);
      });
      state.planks.forEach((p) => {
        svg.removeChild(document.getElementById(p.id)!);
      });
      if (state.crocodile) {
        svg.removeChild(document.getElementById("croc")!);
      }
      function frogRec(n: number) {
        if (n === 1) {
          svg.removeChild(document.getElementById(`frg${n}`)!);
        } else {
          svg.removeChild(document.getElementById(`frg${n}`)!);
          frogRec(n - 1);
        }
      }
      if (state.frogInTargetCount) {
        frogRec(state.frogInTargetCount);
      }
      const ladyFrog = document.getElementById("ladyFrog");
      if (ladyFrog) {
        svg.removeChild(ladyFrog);
      }
    }

    // print the game over text when the game is over and creates a
    // subscription to detect if the player presses "r" to restart the game,
    // or call startGame() if a level is complete.
    if (state.gameOver) {
      const gameOverText = document.createElementNS(svg.namespaceURI, "text")!;
      gameOverText.setAttribute("x", "100");
      gameOverText.setAttribute("y", "300");
      gameOverText.setAttribute("id", "gameover");
      gameOverText.textContent = "Game Over";
      svg.appendChild(gameOverText);

      const restartText = document.createElementNS(svg.namespaceURI, "text")!;
      restartText.setAttribute("x", "140");
      restartText.setAttribute("y", "350");
      restartText.setAttribute("id", "restart");
      restartText.textContent = "Press 'R' to Restart";
      svg.appendChild(restartText);

      const keyDown = fromEvent<KeyboardEvent>(document, "keydown")
        .pipe(
          map(({ key }) => {
            if (key === "r") {
              clearView();
              svg.removeChild(document.getElementById("gameover")!);
              svg.removeChild(document.getElementById("restart")!);
              keyDown.unsubscribe();
              startGame(resetState(state));
            }
          })
        )
        .subscribe();
    } else if (state.passedLevel) {
      clearView();
      startGame(resetState(state));
    }
  }

  // Observable to detect input from the player to move the frog
  const controlFrog = fromEvent<KeyboardEvent>(document, "keydown").pipe(
    map(({ key }) => {
      if (key === "w" || key === "ArrowUp") {
        return new Move(0, -40, true);
      } else if (key === "a" || key === "ArrowLeft") {
        return new Move(-40, 0, false);
      } else if (key === "s" || key === "ArrowDown") {
        return new Move(0, 40, false);
      } else if (key === "d" || key === "ArrowRight") {
        return new Move(40, 0, false);
      }
      return new Move(0, 0, false);
    })
  );

  /**
   * Creates the subscription necessary to start playing the game.
   * 
   * The overall logic of this function is quite similar to the Asteroids
   * example provided by the teaching team. But we can see that after calling
   * updateView in the subscribe call, we check if the game is over or a
   * level has passed so that we can unsubscribe to the subscription when
   * either of the conditions happen.
   * 
   * The reason for putting the merging of Observables and the subscription
   * in a function is to be able to call this function when restarting the
   * game or starting a new level, which is much easier. 
   * 
   * @param s the current state of the game
   */
  function startGame(s: State) {
    const row1Car = interval(2000).pipe(
      take(s.carNum[0]),
      map((_) => new CreateCar(1, 0))
    );
    const row2Car = interval(1800).pipe(
      take(s.carNum[1]),
      map((_) => new CreateCar(2, 1))
    );
    const row3Car = interval(1000).pipe(
      take(s.carNum[2]),
      map((_) => new CreateCar(3, 0))
    );
    const row4Car = interval(1500).pipe(
      take(s.carNum[3]),
      map((_) => new CreateCar(4, 1))
    );
    const row5Car = interval(1500).pipe(
      take(s.carNum[4]),
      map((_) => new CreateCar(5, 0))
    );
    const row6Car = interval(1500).pipe(
      take(s.carNum[5]),
      map((_) => new CreateCar(6, 1))
    );

    const row1Plank = interval(2200).pipe(
      take(s.plankNum[0]),
      map((_) => new CreatePlank(1, 1, 1, 70, 10))
    );
    const row2Plank = interval(2100).pipe(
      take(s.plankNum[1]),
      map((_) => new CreatePlank(2, 0, 1, 70, 10))
    );
    const row3Plank = interval(2000).pipe(
      take(s.plankNum[2]),
      map((_) => new CreatePlank(3, 1, 0.85, 40, 10))
    );
    const row4Plank = interval(2500).pipe(
      take(s.plankNum[3]),
      map((_) => new CreatePlank(4, 0, 1.5, 130, 10))
    );
    const row5Plank = interval(3800).pipe(
      take(s.plankNum[4]),
      map((_) => new CreatePlank(5, 0, 0.6, 50, 10))
    );
    const row6Plank = interval(2100).pipe(
      take(s.plankNum[5]),
      map((_) => new CreatePlank(6, 1, 1, 50, 10))
    );

    const addCroc = interval(6600).pipe(
      take(1),
      map((_) => new CreateCrocodile(1, 1, 1, 70, 10))
    );

    const addLadyFrog = interval(7700).pipe(
      take(1),
      map((_) => new CreateLadyFrog())
    );

    const merger: Observable<Action> = merge(
      gameClock,
      controlFrog,
      row1Car,
      row2Car,
      row3Car,
      row4Car,
      row5Car,
      row6Car,
      row1Plank,
      row2Plank,
      row3Plank,
      row4Plank,
      row5Plank,
      row6Plank,
      addCroc,
      addLadyFrog,
      target1,
      target2,
      target3,
      target4,
      target5
    );

    const subsciption = merger.pipe(scan(reduceState, s)).subscribe((s) => {
      updateView(s);
      if (s.gameOver || s.passedLevel) {
        subsciption.unsubscribe();
      }
    });
  }
  startGame(initialState);
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

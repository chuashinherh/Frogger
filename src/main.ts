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
import { map, scan, take, takeWhile } from "rxjs/operators";
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
    x: number; // the
    y: number;
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
    id: string;
    pos: Pos;
    createTime: number;
    radius: number;
  }>;

  type Car = Readonly<{
    id: string;
    pos: Pos;
    createTime: number;
    radius: number;
    direction: number;
    speed: number;
  }>;

  type Plank = Readonly<{
    id: string;
    pos: Pos;
    createTime: number;
    radiusX: number;
    radiusY: number;
    direction: number;
    speed: number;
  }>;

  type Crocodile = Readonly<{
    id: string;
    pos: Pos;
    createTime: number;
    radiusX: number;
    radiusY: number;
    direction: number;
    speed: number;
  }>;

  type Target = Readonly<{
    id: string;
    pos: Pos;
    createTime: number;
    radius: number;
  }>;

  type River = Readonly<{
    id: string;
    pos: Pos;
    createTime: number;
    radiusX: number;
    radiusY: number;
  }>;

  /**
   * Represents the state of the game at a single point of time.
   * Marked Readonly to prevent mutation for functional purity.
   */
  type State = Readonly<{
    time: number;
    frog: Frog;
    ladyFrog: Frog | null;
    cars: ReadonlyArray<Car>;
    planks: ReadonlyArray<Plank>;
    targets: ReadonlyArray<Target>;
    crocodile: Crocodile | null;
    river: River;
    carCount: number;
    plankCount: number;
    score: number;
    highscore: number;
    level: number;
    multiplier: number;
    carSpeed: ReadonlyArray<number>;
    carNum: ReadonlyArray<number>;
    plankNum: ReadonlyArray<number>;
    frogOnPlank: ReadonlyArray<Plank>;
    ladyFrogOnPlank: ReadonlyArray<Plank>;
    hasFrogTarget: ReadonlyArray<Target>;
    frogPicksUpLadyFrog: boolean;
    frogInTargetCount: number;
    passedLevel: boolean;
    gameOver: boolean;
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

  const createRiver = () =>
    <River>{
      id: "river",
      pos: { x: 0, y: 40 },
      createTime: 0,
      radiusX: 300,
      radiusY: 120,
    };

  const createFrog = (x: number) => (y: number) => (isLadyFrog: boolean) =>
    <Frog>{
      id: isLadyFrog ? "ladyFrog" : "frog",
      pos: { x: x, y: y },
      createTime: 0,
      radius: 10,
    };

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

  const movePlank = (o: Plank | Crocodile, direction: number, speed: number) =>
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

  const moveFrog = (o: Frog, direction: number, speed: number) =>
    <Frog>{
      ...o,
      pos: {
        x: direction === 1 ? o.pos.x - speed : o.pos.x + speed,
        y: o.pos.y,
      },
    };

  const moveLadyFrog = (o: Frog, speed: number) =>
    <Frog>{
      ...o,
      pos: { x: wrapLadyFrog(o.pos.x + speed, o.radius), y: o.pos.y },
    };

  const wrap = (x: number, radius: number) =>
    x + radius < 0 ? x + 600 : x + radius > 600 ? x - 600 : x;

  const wrapLadyFrog = (x: number, radius: number) =>
    x - radius > 600 ? x - 620 : x;

  const wrapPlank = (xPlank: number, radiusPlank: number) =>
    xPlank + radiusPlank * 2 < 0
      ? xPlank + 600 + radiusPlank
      : xPlank > 600
      ? xPlank - 600 - radiusPlank
      : xPlank;

  const tick = (s: State, elapsed: number) => {
    return handleCollisions({
      ...s,
      time: elapsed,
      cars: s.cars.map((e) => moveCar(e, e.direction, e.speed)),
      planks: s.planks.map((e) => movePlank(e, e.direction, e.speed)),
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
        ? movePlank(s.crocodile, s.crocodile.direction, s.crocodile.speed)
        : s.crocodile,
    });
  };

  const handleCollisions = (s: State) => {
    const frogCollided = ([frog, obj]: [Frog, Car | Target | Frog]) => {
      return (
        Math.abs(frog.pos.x - (obj.pos.x + obj.radius)) <
          frog.radius + obj.radius &&
        Math.abs(frog.pos.y - (obj.pos.y + obj.radius)) <
          frog.radius + obj.radius
      );
    };

    const frogCollidedPlankOrRiver = ([frog, obj]: [Frog, Plank | River]) => {
      return (
        Math.abs(frog.pos.x - (obj.pos.x + obj.radiusX)) <
          frog.radius + obj.radiusX &&
        Math.abs(frog.pos.y - (obj.pos.y + obj.radiusY)) <
          frog.radius + obj.radiusY
      );
    };

    const frogCollideCar =
      s.cars.filter((r) => frogCollided([s.frog, r])).length > 0;

    const frogCollidePlank = s.planks.filter((r) =>
      frogCollidedPlankOrRiver([s.frog, r])
    );

    const ladyFrogOnPlank = s.ladyFrog
      ? s.planks.filter((r) => frogCollidedPlankOrRiver([s.ladyFrog!, r]))
      : [];

    const frogPicksUpLadyFrog = s.ladyFrog
      ? frogCollided([s.frog, s.ladyFrog])
      : false;

    const frogCollideRiver =
      frogCollidePlank.length > 0
        ? false
        : frogCollidedPlankOrRiver([s.frog, s.river]);

    const frogOutOfBounds =
      s.frog.pos.x - s.frog.radius > 600 || s.frog.pos.x + s.frog.radius < 0;

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
        s.score >= s.highscore
          ? s.highscore + 200 + 50
          : hasFrogTarget.length > 0 &&
            !s.frogPicksUpLadyFrog &&
            s.score >= s.highscore
          ? s.highscore + 50
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

  function addTarget(n: number): Observable<CreateTarget>[] {
    if (n === 5) {
      return [];
    }
    return [range(1, 1).pipe(map((_) => new CreateTarget(n)))].concat(
      addTarget(n + 1)
    );
  }
  const [target1, target2, target3, target4, target5] = addTarget(0);

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

  function updateView(state: State): State {
    const frog = document.getElementById("frog")!;
    const score = document.getElementById("score")!;
    score.innerHTML = String(state.score);
    const highscore = document.getElementById("highscore")!;
    highscore.innerHTML = String(state.highscore);
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
    return state;
  }

  const controlFrog = fromEvent<KeyboardEvent>(document, "keydown").pipe(
    map(({ key }) => {
      if (key === "w") {
        return new Move(0, -40, true);
      } else if (key === "a") {
        return new Move(-40, 0, false);
      } else if (key === "s") {
        return new Move(0, 40, false);
      } else if (key === "d") {
        return new Move(40, 0, false);
      }
      return new Move(0, 0, false);
    })
  );

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

    return merger
      .pipe(
        scan(reduceState, s),
        map(updateView),
        takeWhile((s) => !s.gameOver && !s.passedLevel)
      )
      .subscribe(updateView);
  }
  startGame(initialState);
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

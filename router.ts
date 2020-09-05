// Copyright 2020 Liam Tan. All rights reserved. MIT license.

import { Router as OakRouter, Middleware } from "./deps.ts";
import {
  RouteDefinition,
  ControllerMetadata,
  Newable,
  ExecutionResult,
  EInjectionScope,
  RequestLifetime,
} from "./types.ts";

import { ExecutionContainer } from "./execution_container.ts";

import { RouterContext } from "./deps.ts";
import { getControllerOwnMeta } from "./metadata.ts";
import DIContainer from "./dependency_container.ts";
/**
 * Router subclass - abstraction on top of `Router` class from Oak.
 *
 * exposes methods `Router.register()` and `router.middleware()` to
 * `Application` class for bootstrapping Oak application
 */
export class Router extends OakRouter {
  #LOGO_ASCII = `\
______           _         _ 
|  _  \\         | |       | |
| | | |__ _  ___| |_ _   _| |
| | | / _\` |/ __| __| | | | |
| |/ / (_| | (__| |_| |_| | |
|___/ \\__,_|\\___|\\__|\\__, |_| FRAMEWORK
                      __/ |  
                      |___/   
  `;
  #bootstrapMsg: string;

  #containerCache: Map<string, ExecutionContainer>;

  constructor() {
    super();
    this.#bootstrapMsg = this.#LOGO_ASCII + "\n";
    this.#containerCache = new Map<string, ExecutionContainer>();
  }

  get containerCache(): Map<string, ExecutionContainer> {
    return this.#containerCache;
  }

  /**
   * Register function consumed by `Application`, takes controller
   * class definition and strips it's metadata. From this metadata,
   * the `register` function appropriately configures `super()` oak
   * router. An instance of the provided controller class definition
   * is created, and the controller's actions are mapped to routes,
   * E.g.
   *
   * ```ts
   * import { DinosaurController } from "./example/DinosaurController.ts";
   *
   * const router: Router = new Router();
   * router.register(DinosaurController);
   * // router superclass now configured to use DinosaurController's actions
   * ```
   */
  register(controller: Newable<any>): void {
    const meta: ControllerMetadata | undefined = getControllerOwnMeta(controller);
    if (!meta) {
      throw new Error("Attempted to register non-controller class to DactylRouter");
    }

    const { prefix, routes }: ControllerMetadata = meta;

    // An execution container is made for each controller.
    const container: ExecutionContainer = new ExecutionContainer(meta, controller.name);
    this.#containerCache.set(String(prefix), container);

    this.#appendToBootstrapMsg(`${prefix}\n`);

    routes.forEach((route: RouteDefinition): void => {
      const { requestMethod, path }: RouteDefinition = route;

      this.#appendToBootstrapMsg(`  [${requestMethod.toUpperCase()}] ${path}\n`);

      const normalizedPath: string = this.#normalizedPath(String(prefix), path);

      (<Function>this[route.requestMethod])(
        normalizedPath,
        async (context: RouterContext): Promise<void> => {
          // on execution, tell the container what route to execute,
          // and provide it the currently given context.

          // TODO redundant infomation here. The route definition should actually
          // be in the context. The execution container should maybe only take
          // the context, and use the rest to execute. Maybe store the controllers
          // in DI by the PREFIX, not the name. That way, they can be resolved
          // using the context. This is actually smaht. Do this instead.
          const result: ExecutionResult = await container.execute(route, context);

          context.response.body = result.body;
          context.response.status = result.status;
        }
      );
    });
    this.#appendToBootstrapMsg("");
  }
  /**
   * Helper method that combines controller prefix with route path.
   *
   * If the path terminates in `/`, slice it.
   */
  #normalizedPath = (prefix: string, path: string) => {
    let normalizedPath: string = prefix + path;
    if (normalizedPath.slice(-1) === "/") {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
  };
  /**
   * middleware getter for the internal router. To be used in `Application` bootstrap
   * where appropriate, E.g.
   *
   * ```ts
   * // From Oak
   * const app: Application = new Application();
   * // From Dactyl
   * const router: Router = new Router();
   * // ... register controllers ...
   * app.use(router.middleware());
   * // routes now mapped to oak
   * ```
   */
  middleware(): Middleware {
    return this.routes();
  }
  /**
   * Returns message to be displayed when application starts
   */
  getBootstrapMsg(): string {
    return this.#bootstrapMsg;
  }
  /**
   * Helper that updates the internal bootstrap message. Used on application start
   * to display on screen success.
   */
  #appendToBootstrapMsg = (msg: string): string => {
    this.#bootstrapMsg += msg;
    return this.#bootstrapMsg;
  };
}

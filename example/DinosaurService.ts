// Copyright 2020 Liam Tan. All rights reserved. MIT license.

import { Injectable, EInjectionScope } from "./deps.ts";

/**
 * Example DinosaurService, to demonstrate dependency injection
 */
@Injectable(EInjectionScope.SINGLETON)
export default class DinosaurService {
  #dinosaurs: Array<any> = [
    { id: 0, name: "Tyrannosaurus Rex", period: "Maastrichtian" },
    { id: 1, name: "Velociraptor", period: "Cretaceous" },
    { id: 2, name: "Diplodocus", period: "Oxfordian" },
  ];

  getAll(): Array<any> {
    return this.#dinosaurs;
  }

  getById(id: string): any {
    return this.#dinosaurs[parseInt(id, 10)];
  }
}

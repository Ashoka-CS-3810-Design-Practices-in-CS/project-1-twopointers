// One controller per structure, created the first time its tab is opened and
// kept for the rest of the visit. Switching tabs therefore never loses what
// you built or where you were in an operation.

import { useSyncExternalStore } from 'react';
import type { StructureId } from '../core/types';
import { structureById } from '../registry';
import { settings, type Settings } from './settings';
import { WorkspaceController, type WorkspaceView } from './WorkspaceController';

const controllers = new Map<StructureId, WorkspaceController>();

export function getWorkspace(id: StructureId): WorkspaceController {
  let controller = controllers.get(id);
  if (!controller) {
    controller = new WorkspaceController(structureById(id), settings);
    controllers.set(id, controller);
  }
  return controller;
}

export function useWorkspace(id: StructureId): [WorkspaceView, WorkspaceController] {
  const controller = getWorkspace(id);
  const view = useSyncExternalStore(controller.subscribe, controller.getView);
  return [view, controller];
}

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get);
}

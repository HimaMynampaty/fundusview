import { DR_MODE }       from './dr'
import { GLAUCOMA_MODE } from './glaucoma'
// import { AMD_MODE }   from './amd'  ← add new modes here

/**
 * MODES registry
 * To add a new mode: import its config and append it to this array.
 * Nothing else in the codebase changes.
 */
export const MODES = [
  DR_MODE,
  GLAUCOMA_MODE,
]

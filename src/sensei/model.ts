import artifact from './models/guided-spr-h01.v1.json' with { type: 'json' };
import { chooseHint } from './guided-policy.ts';
import type { GuideContext, GuideModel } from './guided-policy.ts';
import type { Observation } from '../opponent/types.ts';

export const guidedModel = artifact as GuideModel;
export const guidedHint = (observation: Observation, context: GuideContext) => chooseHint(observation, context, guidedModel);

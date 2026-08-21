import { buildAnthropometricProfile } from '../generators/anthropometry.js';
import { buildHumanShapeCoefficients, applyShapeSpace } from './shape-space.js';

/**
 * Engine Person Human Model (EPHM)
 * Independent parametric architecture inspired by public literature on
 * statistical body models, but using Engine Person's own procedural mesh,
 * coefficient definitions, topology generation and deformation fields.
 *
 * M(beta, theta, psi) = W(T + Bshape(beta) + Bpose(theta) + Bexpr(psi), J(beta), theta, weights)
 *
 * Current implementation exposes the identity/shape layer. Pose and expression
 * remain modular so the runtime can evolve without changing project files.
 */
export class EnginePersonHumanModel {
  constructor(profile){
    this.profile=profile;
    this.anthropometry=buildAnthropometricProfile(profile);
    this.beta=buildHumanShapeCoefficients(profile,this.anthropometry);
    this.theta={};
    this.psi={
      smile:profile.smile??0,
      jawOpen:profile.jawOpen??0,
      browRaise:profile.browRaise??0,
      squint:profile.squint??0
    };
  }

  applyIdentity(mesh,region='body'){
    return applyShapeSpace(mesh,this.profile,this.anthropometry,{region});
  }

  metadata(){
    return {
      name:'Engine Person Human Model',
      version:'1.0',
      equation:'M(beta,theta,psi)',
      beta:this.beta,
      psi:this.psi,
      independent:true
    };
  }
}

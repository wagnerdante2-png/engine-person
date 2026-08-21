import { buildAnthropometricProfile } from '../generators/anthropometry.js';
import { buildHumanShapeCoefficients, applyShapeSpace } from './shape-space.js';
import { buildExpressionCoefficients, applyExpressionSpace } from './expression-space.js';

/**
 * Engine Person Human Model (EPHM)
 * Independent parametric architecture informed by public statistical-head/body
 * literature, while using Engine Person's own mesh generation, coefficient
 * definitions, topology, landmarks and deformation fields.
 *
 * M(beta, theta, psi) = W(T + Bshape(beta) + Bpose(theta) + Bexpr(psi), J(beta), theta, weights)
 */
export class EnginePersonHumanModel {
  constructor(profile){
    this.profile=profile;
    this.anthropometry=buildAnthropometricProfile(profile);
    this.beta=buildHumanShapeCoefficients(profile,this.anthropometry);
    this.theta={
      neckYaw:profile.neckYaw??0,
      neckPitch:profile.neckPitch??0,
      headTilt:profile.headTilt??0,
      eyeYaw:profile.eyeYaw??0,
      eyePitch:profile.eyePitch??0,
      jawOpen:profile.jawOpen??0,
      jawForward:profile.jawForward??0
    };
    this.psi=buildExpressionCoefficients(profile);
  }

  applyIdentity(mesh,region='body'){
    return applyShapeSpace(mesh,this.profile,this.anthropometry,{region});
  }

  applyExpression(mesh){
    return applyExpressionSpace(mesh,this.profile,this.anthropometry);
  }

  metadata(){
    return {
      name:'Engine Person Human Model',
      version:'1.3',
      equation:'M(beta,theta,psi)',
      beta:this.beta,
      theta:this.theta,
      psi:this.psi,
      architecture:{shape:'linear-local-bases',expression:'global-smooth-bases',pose:'articulated+correctives',landmarks:'static+dynamic-contour'},
      independent:true
    };
  }
}

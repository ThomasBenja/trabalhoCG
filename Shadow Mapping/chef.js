class Chef {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    
    this.position = [0, 0, 0];
    this.rotation = 0;
    this.baseRotation = [0, 0, 0]; 
    this.scale = 1.0;
    
    this.armAngle = 0;
    this.armTarget = 0;
    this.armAnimating = false;
    this.armTimer = 0;
    
    this.moveSpeed = 2.5;
    
    this.parts = [
      { name:'torso', color:[0.8,0.55,0.4], t:[0,0,1.0], s:[0.9,0.5,1.2] },
      { name:'head', color:[1.0,0.85,0.8], t:[0,0,1.95], s:[0.6,0.6,0.6] },
      { name:'hat', color:[1,1,1], t:[0,0,2.4], s:[0.7,0.4,0.2] },
      { name:'leftArm', color:[0.8,0.55,0.4], t:[-0.7,0,1.2], s:[0.25,0.25,0.8] },
      { name:'rightArm', color:[0.8,0.55,0.4], t:[0.7,0,1.2], s:[0.25,0.25,0.8], isArm:true },
      { name:'leftLeg', color:[0.2,0.2,0.6], t:[-0.25,0,0.35], s:[0.25,0.25,0.7] },
      { name:'rightLeg', color:[0.2,0.2,0.6], t:[0.25,0,0.35], s:[0.25,0.25,0.7] },
      { name:'apron', color:[0.95,0.95,0.95], t:[0,0.26,1.0], s:[0.65,0.02,0.8] }
    ];
    
    this.setupCubeGeometry();
  }
  
  setupCubeGeometry() {
    const gl = this.gl;
    
    const cubePositions = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
      // Back face
      -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
      // Top
      -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,
      // Bottom
      -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
      // Right
       0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
      // Left
      -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5
    ]);

    const cubeNormals = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0, -1,0,0, -1,0,0, -1,0,0
    ]);

    const cubeIndices = new Uint16Array([
      0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11,
      12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23
    ]);

    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);

    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

    this.idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
    
    this.indexCount = cubeIndices.length;
  }
  
 update(dt, keys = {}) {
    const turnSpeed = 3.0; 

    // 1. Rotação
    if(keys['a']) this.rotation += turnSpeed * dt;
    if(keys['d']) this.rotation -= turnSpeed * dt;
    
    // 2. Movimento
    if(keys['w'] || keys['s']) {
      const dir = keys['w'] ? 1 : -1;
      const moveDirX = -Math.sin(this.rotation);
      const moveDirY = Math.cos(this.rotation);
      
      const deltaX = moveDirX * this.moveSpeed * dt * dir;
      const deltaY = moveDirY * this.moveSpeed * dt * dir;

      const limiteParede = 3.8;

      let nextX = this.position[0] + deltaX;
      
      if (nextX > limiteParede) nextX = limiteParede;
      if (nextX < -limiteParede) nextX = -limiteParede;

      if (!this.checkCollision(nextX, this.position[1])) {
          this.position[0] = nextX;
      }

      let nextY = this.position[1] + deltaY;

      if (nextY > limiteParede) nextY = limiteParede;
      if (nextY < -limiteParede) nextY = -limiteParede;

      if (!this.checkCollision(this.position[0], nextY)) {
          this.position[1] = nextY;
      }
    }
    
    // Animação do braço 
    if(this.armAnimating) {
      this.armTimer += dt;
      const duration = 0.6;
      const t = Math.min(1, this.armTimer / duration);
      const ease = t < 0.5 ? (2*t*t) : (1 - Math.pow(-2*t+2, 2)/2);
      this.armAngle = this.armTarget * ease;
      if(t >= 1) {
        this.armTarget = 0;
        this.armAnimating = false;
      }
    }
  }

  // Verifica se uma posição (x, y) bate em algum objeto
  checkCollision(x, y) {
    if (x > 2.8 && x < 5.0 && y > -1.8 && y < 0.2) {
      return true; 
    }

    if (x < -3.5 && x > -6.0 && y > 2.0 && y < 6.0) {
      return true; 
    }

    return false; 
  }

  triggerArmAnimation() {
    if(this.armAnimating) return;
    this.armTarget = -1.15;
    this.armAnimating = true;
    this.armTimer = 0;
  }
  
  draw(gl, uniforms, drawCubeFn = null) {
    const drawPart = drawCubeFn || this.defaultDrawCube.bind(this);
    
    for(const p of this.parts) {
      let m = this.identity();
      
      m = this.multiply(m, this.translate(this.position[0], this.position[1], this.position[2]));
      
      m = this.multiply(m, this.rotateX(this.baseRotation[0]));
      m = this.multiply(m, this.rotateY(this.baseRotation[1]));
      m = this.multiply(m, this.rotateZ(this.baseRotation[2]));
      
      m = this.multiply(m, this.rotateZ(this.rotation));
      
      m = this.multiply(m, this.scale3d(this.scale, this.scale, this.scale));
      
      const s = this.scale3d(p.s[0], p.s[1], p.s[2]);
      
      if(p.isArm) {
        const t1 = this.translate(p.t[0], p.t[1], p.t[2]);
        const rot = this.rotateY(this.armAngle); 
        m = this.multiply(m, t1);
        m = this.multiply(m, rot);
        m = this.multiply(m, s);
      } else {
        m = this.multiply(m, this.translate(p.t[0], p.t[1], p.t[2]));
        m = this.multiply(m, s);
      }
      
      drawPart(m, p.color, uniforms);
    }
  }
  
  defaultDrawCube(modelMat, color, uniforms) {
    const gl = this.gl;
    
    gl.uniformMatrix4fv(uniforms.uModel, false, modelMat);
    gl.uniform3fv(uniforms.uColor, new Float32Array(color));
    
    const posLoc = gl.getAttribLocation(this.program, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    
    const normLoc = gl.getAttribLocation(this.program, 'normal');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.enableVertexAttribArray(normLoc);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }
  
  identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }
  
  multiply(a, b) {
    const out = new Float32Array(16);
    for(let i=0; i<4; i++) {
      for(let j=0; j<4; j++) {
        let s=0;
        for(let k=0; k<4; k++) s += a[k*4 + i] * b[j*4 + k];
        out[j*4 + i] = s;
      }
    }
    return out;
  }
  
  translate(tx, ty, tz) {
    const m = this.identity();
    m[12] = tx; m[13] = ty; m[14] = tz;
    return m;
  }
  
  scale3d(sx, sy, sz) {
    const m = this.identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  }
  
  rotateZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    const m = this.identity();
    m[0] = c; m[4] = -s; m[1] = s; m[5] = c;
    return m;
  }
  
  rotateX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    const m = this.identity();
    m[5] = c; m[9] = -s; m[6] = s; m[10] = c;
    return m;
  }
  
  rotateY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    const m = this.identity();
    m[0] = c; m[8] = s; m[2] = -s; m[10] = c;
    return m;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Chef;
}

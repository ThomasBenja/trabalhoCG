'use strict';

// Array flattening trick from http://stackoverflow.com/questions/10865025/merge-flatten-a-multidimensional-array-in-javascript

var LightMapDemoScene = function (gl) {
	this.gl = gl;

	this.chef = null;
	this.chefKeys = {};

	this.waiter = null;
	this.waiterKeys = {};

	this.score = 0;
	
	this.isGameStarted = false; 
    this.startTime = 0;

	this.gameDuration = 10; // Tempo total em segundos (ex: 60 segundos)
    this.isGameOver = false;
};

LightMapDemoScene.prototype.Load = function (cb) {
	console.log('Loading demo scene');

	var me = this;

	async.parallel({
		Models: function (callback) {
			async.map({
				RoomModel: 'Room.json'
			}, LoadJSONResource, callback);
		},
		OBJModels: function (callback) {
			async.map({
				Carne: 'models/carne.obj',
				PaoBase: 'models/base.obj',
				PaoTopo: 'models/topo.obj',
				Queijo: 'models/cheese.obj',
				Salada: 'models/alface.obj',
				Tomate: 'models/tomato.obj'
			}, LoadOBJ, callback);
		},
		ShaderCode: function (callback) {
			async.map({
				'NoShadow_VSText': 'shaders/NoShadow.vs.glsl',
				'NoShadow_FSText': 'shaders/NoShadow.fs.glsl',
				'Shadow_VSText': 'shaders/Shadow.vs.glsl',
				'Shadow_FSText': 'shaders/Shadow.fs.glsl',
				'ShadowMapGen_VSText': 'shaders/ShadowMapGen.vs.glsl',
				'ShadowMapGen_FSText': 'shaders/ShadowMapGen.fs.glsl'
			}, LoadTextResource, callback);
		}
	}, function (loadErrors, loadResults) {
		if (loadErrors) {
			cb(loadErrors);
			return;
		}

		//
		// Create Model objects
		//
		for (var i = 0; i < loadResults.Models.RoomModel.meshes.length; i++) {
			var mesh = loadResults.Models.RoomModel.meshes[i];
			switch (mesh.name) {
				case 'TableMesh':
					me.TableMesh = new Model(
						me.gl, mesh.vertices, [].concat.apply([], mesh.faces),
						mesh.normals, vec4.fromValues(1, 0, 1, 1)
					);
					mat4.translate(
						me.TableMesh.world, me.TableMesh.world,
						vec3.fromValues(3.876, -0.79374, 0.49672)
					);
					break;
				case 'LightBulbMesh':
					me.lightPosition = vec3.fromValues(0, 0.0, 2.58971);
					me.LightMesh = new Model(
						me.gl, mesh.vertices, [].concat.apply([], mesh.faces),
						mesh.normals, vec4.fromValues(4, 4, 4, 1)
					);
					mat4.translate(me.LightMesh.world, me.LightMesh.world,
						me.lightPosition
					);
					break;
				case 'WallsMesh':
					me.WallsMesh = new Model(
						me.gl, mesh.vertices, [].concat.apply([], mesh.faces),
						mesh.normals, vec4.fromValues(0.3, 0.3, 0.3, 1)
					);
					break;
			}
		}

		if (!me.TableMesh) {
			cb('Failed to load table mesh'); return;
		}
		if (!me.LightMesh) {
			cb('Failed to load light mesh'); return;
		}
		if (!me.WallsMesh) {
			cb('Failed to load walls mesh'); return;
		}

		var cubeData = GetCubeData();

        me.CounterMesh = new Model(
            me.gl, 
            cubeData.vertices, 
            cubeData.indices, 
            cubeData.normals, 
            vec4.fromValues(0.6, 0.4, 0.2, 1.0) // Cor Marrom
        );

		mat4.translate(me.CounterMesh.world, me.CounterMesh.world, vec3.fromValues(-4.49, 3.5, 0.5));
        mat4.scale(me.CounterMesh.world, me.CounterMesh.world, vec3.fromValues(0.5, 1.5, 0.5));

		// Create OBJ meshes if loaded
		if (loadResults.OBJModels) {
			var obj = loadResults.OBJModels;
			
			// Hambúrguer
			if (obj.PaoBase) {
				me.HamburguerMesh = new Model(
					me.gl,
					obj.PaoBase.vertices,
					obj.PaoBase.indices,
					obj.PaoBase.normals,
					vec4.fromValues(0.8, 0.5, 0.2, 1)
				);
				mat4.translate(me.HamburguerMesh.world, me.HamburguerMesh.world, vec3.fromValues(3, -1, 1.15));
				mat4.rotate(me.HamburguerMesh.world, me.HamburguerMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.HamburguerMesh.world, me.HamburguerMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			if(obj.Salada) {
				me.SaladaMesh = new Model(me.gl, obj.Salada.vertices, obj.Salada.indices, obj.Salada.normals, vec4.fromValues(0.63, 0.79, 0.21, 1.0));
				mat4.translate(me.SaladaMesh.world, me.SaladaMesh.world, vec3.fromValues(3, -1, 1.15));
				mat4.rotate(me.SaladaMesh.world, me.SaladaMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.SaladaMesh.world, me.SaladaMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			if(obj.Carne) {
				me.CarneMesh = new Model(me.gl, obj.Carne.vertices, obj.Carne.indices, obj.Carne.normals, vec4.fromValues(0.38, 0.25, 0.25, 1));
				mat4.translate(me.CarneMesh.world, me.CarneMesh.world, vec3.fromValues(3, -1, 1.15));
				mat4.rotate(me.CarneMesh.world, me.CarneMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.CarneMesh.world, me.CarneMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			if(obj.Queijo) {
				me.QueijoMesh = new Model(me.gl, obj.Queijo.vertices, obj.Queijo.indices, obj.Queijo.normals, vec4.fromValues(0.93, 0.60, 0.04, 1.0));
				mat4.translate(me.QueijoMesh.world, me.QueijoMesh.world, vec3.fromValues(3, -1, 1.15));
				mat4.rotate(me.QueijoMesh.world, me.QueijoMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.QueijoMesh.world, me.QueijoMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			if(obj.Tomate) {
				me.TomateMesh = new Model(me.gl, obj.Tomate.vertices, obj.Tomate.indices, obj.Tomate.normals, vec4.fromValues(1.0, 0.388, 0.278, 1.0));
				mat4.translate(me.TomateMesh.world, me.TomateMesh.world, vec3.fromValues(3, -1, 1.13));
				mat4.rotate(me.TomateMesh.world, me.TomateMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.TomateMesh.world, me.TomateMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}		
			if(obj.PaoTopo) {
				me.PaoTopoMesh = new Model(me.gl, obj.PaoTopo.vertices, obj.PaoTopo.indices, obj.PaoTopo.normals, vec4.fromValues(0.8, 0.5, 0.2, 1));
				mat4.translate(me.PaoTopoMesh.world, me.PaoTopoMesh.world, vec3.fromValues(3, -1, 1.09));
				mat4.rotate(me.PaoTopoMesh.world, me.PaoTopoMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.PaoTopoMesh.world, me.PaoTopoMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}			

		}

		me.Meshes = [
			me.TableMesh,
			me.LightMesh,
			me.WallsMesh,
			me.CounterMesh,
		];

		if (me.HamburguerMesh) me.Meshes.push(me.HamburguerMesh);
		if (me.CarneMesh) me.Meshes.push(me.CarneMesh);
		if (me.PaoBaseMesh) me.Meshes.push(me.PaoBaseMesh);
		if (me.PaoTopoMesh) me.Meshes.push(me.PaoTopoMesh);
		if (me.QueijoMesh) me.Meshes.push(me.QueijoMesh);
		if (me.SaladaMesh) me.Meshes.push(me.SaladaMesh);
		if (me.TomateMesh) me.Meshes.push(me.TomateMesh);

		//
		// Create Shaders
		//
		me.NoShadowProgram = CreateShaderProgram(
			me.gl, loadResults.ShaderCode.NoShadow_VSText,
			loadResults.ShaderCode.NoShadow_FSText
		);
		if (me.NoShadowProgram.error) {
			cb('NoShadowProgram ' + me.NoShadowProgram.error); return;
		}

		me.ShadowProgram = CreateShaderProgram(
			me.gl, loadResults.ShaderCode.Shadow_VSText,
			loadResults.ShaderCode.Shadow_FSText
		);
		if (me.ShadowProgram.error) {
			cb('ShadowProgram ' + me.ShadowProgram.error); return;
		}

		me.ShadowMapGenProgram = CreateShaderProgram(
			me.gl, loadResults.ShaderCode.ShadowMapGen_VSText,
			loadResults.ShaderCode.ShadowMapGen_FSText
		);
		if (me.ShadowMapGenProgram.error) {
			cb('ShadowMapGenProgram ' + me.ShadowMapGenProgram.error); return;
		}

		me.NoShadowProgram.uniforms = {
			mProj: me.gl.getUniformLocation(me.NoShadowProgram, 'mProj'),
			mView: me.gl.getUniformLocation(me.NoShadowProgram, 'mView'),
			mWorld: me.gl.getUniformLocation(me.NoShadowProgram, 'mWorld'),

			pointLightPosition: me.gl.getUniformLocation(me.NoShadowProgram, 'pointLightPosition'),
			meshColor: me.gl.getUniformLocation(me.NoShadowProgram, 'meshColor'),
		};
		me.NoShadowProgram.attribs = {
			vPos: me.gl.getAttribLocation(me.NoShadowProgram, 'vPos'),
			vNorm: me.gl.getAttribLocation(me.NoShadowProgram, 'vNorm'),
		};

		me.ShadowProgram.uniforms = {
			mProj: me.gl.getUniformLocation(me.ShadowProgram, 'mProj'),
			mView: me.gl.getUniformLocation(me.ShadowProgram, 'mView'),
			mWorld: me.gl.getUniformLocation(me.ShadowProgram, 'mWorld'),

			pointLightPosition: me.gl.getUniformLocation(me.ShadowProgram, 'pointLightPosition'),
			meshColor: me.gl.getUniformLocation(me.ShadowProgram, 'meshColor'),
			lightShadowMap: me.gl.getUniformLocation(me.ShadowProgram, 'lightShadowMap'),
			shadowClipNearFar: me.gl.getUniformLocation(me.ShadowProgram, 'shadowClipNearFar'),

			bias: me.gl.getUniformLocation(me.ShadowProgram, 'bias')
		};
		me.ShadowProgram.attribs = {
			vPos: me.gl.getAttribLocation(me.ShadowProgram, 'vPos'),
			vNorm: me.gl.getAttribLocation(me.ShadowProgram, 'vNorm'),
		};

		me.ShadowMapGenProgram.uniforms = {
			mProj: me.gl.getUniformLocation(me.ShadowMapGenProgram, 'mProj'),
			mView: me.gl.getUniformLocation(me.ShadowMapGenProgram, 'mView'),
			mWorld: me.gl.getUniformLocation(me.ShadowMapGenProgram, 'mWorld'),

			pointLightPosition: me.gl.getUniformLocation(me.ShadowMapGenProgram, 'pointLightPosition'),
			shadowClipNearFar: me.gl.getUniformLocation(me.ShadowMapGenProgram, 'shadowClipNearFar'),
		};
		me.ShadowMapGenProgram.attribs = {
			vPos: me.gl.getAttribLocation(me.ShadowMapGenProgram, 'vPos'),
		};

		//
		// Create Framebuffers and Textures
		//
		me.shadowMapCube = me.gl.createTexture();
		me.gl.bindTexture(me.gl.TEXTURE_CUBE_MAP, me.shadowMapCube);
		me.gl.texParameteri(me.gl.TEXTURE_CUBE_MAP, me.gl.TEXTURE_MIN_FILTER, me.gl.LINEAR);
		me.gl.texParameteri(me.gl.TEXTURE_CUBE_MAP, me.gl.TEXTURE_MAG_FILTER, me.gl.LINEAR);
		me.gl.texParameteri(me.gl.TEXTURE_CUBE_MAP, me.gl.TEXTURE_WRAP_S, me.gl.MIRRORED_REPEAT);
		me.gl.texParameteri(me.gl.TEXTURE_CUBE_MAP, me.gl.TEXTURE_WRAP_T, me.gl.MIRRORED_REPEAT);
		me.floatExtension = me.gl.getExtension("OES_texture_float");
		me.floatLinearExtension = me.gl.getExtension("OES_texture_float_linear");
		if (me.floatExtension && me.floatLinearExtension) {
			for (var i = 0; i < 6; i++) {
				me.gl.texImage2D(
					me.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
					0, me.gl.RGBA,
					me.textureSize, me.textureSize,
					0, me.gl.RGBA,
					me.gl.FLOAT, null
				);
			}
		} else {
			for (var i = 0; i < 6; i++) {
				me.gl.texImage2D(
					me.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
					0, me.gl.RGBA,
					me.textureSize, me.textureSize,
					0, me.gl.RGBA,
					me.gl.UNSIGNED_BYTE, null
				);
			}
		}

		me.shadowMapFramebuffer = me.gl.createFramebuffer();
		me.gl.bindFramebuffer(me.gl.FRAMEBUFFER, me.shadowMapFramebuffer);

		me.shadowMapRenderbuffer = me.gl.createRenderbuffer();
		me.gl.bindRenderbuffer(me.gl.RENDERBUFFER, me.shadowMapRenderbuffer);
		me.gl.renderbufferStorage(
			me.gl.RENDERBUFFER, me.gl.DEPTH_COMPONENT16,
			me.textureSize, me.textureSize
		);

		me.gl.bindTexture(me.gl.TEXTURE_CUBE_MAP, null);
		me.gl.bindRenderbuffer(me.gl.RENDERBUFFER, null);
		me.gl.bindFramebuffer(me.gl.FRAMEBUFFER, null);

		//
		// Logical Values
		//
		me.camera = new Camera(
			vec3.fromValues(0, 0, 1.85),
			vec3.fromValues(-0.3, -1, 1.85),
			vec3.fromValues(0, 0, 1)
		);

		me.projMatrix = mat4.create();
		me.viewMatrix = mat4.create();

		mat4.perspective(
			me.projMatrix,
			glMatrix.toRadian(90),
			me.gl.canvas.clientWidth / me.gl.canvas.clientHeight,
			0.35,
			85.0
		);

		me.shadowMapCameras = [
			// Positive X
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(1, 0, 0)),
				vec3.fromValues(0, -1, 0)
			),
			// Negative X
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(-1, 0, 0)),
				vec3.fromValues(0, -1, 0)
			),
			// Positive Y
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, 1, 0)),
				vec3.fromValues(0, 0, 1)
			),
			// Negative Y
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, -1, 0)),
				vec3.fromValues(0, 0, -1)
			),
			// Positive Z
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, 0, 1)),
				vec3.fromValues(0, -1, 0)
			),
			// Negative Z
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, 0, -1)),
				vec3.fromValues(0, -1, 0)
			),
		];
		me.shadowMapViewMatrices = [
			mat4.create(),
			mat4.create(),
			mat4.create(),
			mat4.create(),
			mat4.create(),
			mat4.create()
		];
		me.shadowMapProj = mat4.create();
		me.shadowClipNearFar = vec2.fromValues(0.05, 15.0);
		mat4.perspective(
			me.shadowMapProj,
			glMatrix.toRadian(90),
			1.0,
			me.shadowClipNearFar[0],
			me.shadowClipNearFar[1]
		);

		cb();

		me.chef = new Chef(me.gl, me.ShadowProgram);
		me.chef.position = [0, 1, 0]; 
		me.chef.scale = 0.75; 
		me.chef.baseRotation = [0, 0, 0];  
		me.chef.moveSpeed = 1.5; 
		
		console.log('Chef carregado com sucesso!');

		me.waiter = new waiter(me.gl, me.ShadowProgram);
		me.waiter.position = [3, 1, 0]; // Posiciona em outro lugar
		me.waiter.scale = 0.75;
		me.waiter.baseRotation = [0, 0, 0];
		me.waiter.moveSpeed = 1.5;

		console.log('Garçom carregado com sucesso!');
	});

	me.PressedKeys = {
		Up: false,
		Right: false,
		Down: false,
		Left: false,
		Forward: false,
		Back: false,

		RotLeft: false,
		RotRight: false,

		WaiterForward: false,
		WaiterBack: false,
		WaiterLeft: false,
		WaiterRight: false,
	};

	me.MoveForwardSpeed = 3.5;
	me.RotateSpeed = 1.5;
	me.textureSize = getParameterByName('texSize') || 512;

	me.lightDisplacementInputAngle = 0.0;

	var btnInicio = document.getElementById('BotaoInicio');
    if (btnInicio) {
        btnInicio.onclick = function() {
            // Esconde a tela de início
            document.getElementById('TelaDeInicio').style.display = 'none';
            
			document.getElementById('placar').style.display = 'block';
            document.getElementById('relogio').style.display = 'block';
            // Destrava o jogo
            me.isGameStarted = true;
            
            // Inicia o relógio AGORA (para não contar o tempo que ficou no menu)
            me.startTime = Date.now();
            
            console.log("Jogo Iniciado!");
        };
    }
};

LightMapDemoScene.prototype.Unload = function () {
	this.LightMesh = null;;
	this.TableMesh = null;
	this.WallsMesh = null;

	this.NoShadowProgram = null;
	this.ShadowProgram = null;
	this.ShadowMapGenProgram = null;

	this.camera = null;
	this.lightPosition = null;

	this.Meshes = null;

	this.PressedKeys = null;

	this.MoveForwardSpeed = null;
	this.RotateSpeed = null;

	this.shadowMapCube = null;
	this.textureSize = null;

	this.shadowMapCameras = null;
	this.shadowMapViewMatrices = null;
};

LightMapDemoScene.prototype.Begin = function () {
	console.log('Beginning demo scene');

	var me = this;

	// Attach event listeners
	this.__ResizeWindowListener = this._OnResizeWindow.bind(this);
	this.__KeyDownWindowListener = this._OnKeyDown.bind(this);
	this.__KeyUpWindowListener = this._OnKeyUp.bind(this);

	AddEvent(window, 'resize', this.__ResizeWindowListener);
	AddEvent(window, 'keydown', this.__KeyDownWindowListener);
	AddEvent(window, 'keyup', this.__KeyUpWindowListener);
	
	// Render Loop
	var previousFrame = performance.now();
	var dt = 0;
	var loop = function (currentFrameTime) {
		dt = currentFrameTime - previousFrame;
		me._Update(dt);
		previousFrame = currentFrameTime;

		me._GenerateShadowMap();
		me._Render();
		me.nextFrameHandle = requestAnimationFrame(loop);
	};
	me.nextFrameHandle = requestAnimationFrame(loop);

	me._OnResizeWindow();
};

LightMapDemoScene.prototype.End = function () {
	if (this.__ResizeWindowListener) {
		RemoveEvent(window, 'resize', this.__ResizeWindowListener);
	}
	if (this.__KeyUpWindowListener) {
		RemoveEvent(window, 'keyup', this.__KeyUpWindowListener);
	}
	if (this.__KeyDownWindowListener) {
		RemoveEvent(window, 'keydown', this.__KeyDownWindowListener);
	}

	if (this.nextFrameHandle) {
		cancelAnimationFrame(this.nextFrameHandle);
	}
};

// Utility: set position and optional uniform scale for ingredient meshes at runtime
LightMapDemoScene.prototype.SetIngredientPosition = function (name, x, y, z, scale) {
	var mesh = this[name + 'Mesh'];
	if (!mesh) return false;

	// Reset world transform then apply translate and optional scale
	mat4.identity(mesh.world);
	mat4.translate(mesh.world, mesh.world, vec3.fromValues(x, y, z));
	if (typeof scale !== 'undefined' && scale !== null) {
		mat4.scale(mesh.world, mesh.world, vec3.fromValues(scale, scale, scale));
	}
	return true;
};

// Utility: rotate ingredient mesh around a given axis
// axis: vec3 (0,0,1) for Z-axis, (1,0,0) for X-axis, (0,1,0) for Y-axis
// angleRadians: rotation angle in radians (use Math.PI / 180 * degrees to convert from degrees)
LightMapDemoScene.prototype.RotateIngredient = function (name, axis, angleRadians) {
	var mesh = this[name + 'Mesh'];
	if (!mesh) return false;

	mat4.rotate(mesh.world, mesh.world, angleRadians, axis);
	return true;
};

//
// Private Methods
//
LightMapDemoScene.prototype._Update = function (dt) {
	//  SE O JOGO ACABOU, NÃO CALCULE NADA
    if (!this.isGameStarted || this.isGameOver) {
        return; // Sai da função imediatamente. O boneco congela.
    }

    //  VERIFICA O TEMPO
    var now = Date.now();
    var secondsPassed = Math.floor((now - this.startTime) / 1000);

	this.UpdateTimerDisplay();

	if (secondsPassed >= this.gameDuration) {
        this.EndGame();
        return; // Sai da função
    }

	/*if (this.PressedKeys.Forward && !this.PressedKeys.Back) {
		this.camera.moveForward(dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.Back && !this.PressedKeys.Forward) {
		this.camera.moveForward(-dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.Right && !this.PressedKeys.Left) {
		this.camera.moveRight(dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.Left && !this.PressedKeys.Right) {
		this.camera.moveRight(-dt / 1000 * this.MoveForwardSpeed);
	}*/

	if (this.PressedKeys.Up && !this.PressedKeys.Down) {
		this.camera.moveUp(dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.Down && !this.PressedKeys.Up) {
		this.camera.moveUp(-dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.RotRight && !this.PressedKeys.RotLeft) {
		this.camera.rotateRight(-dt / 1000 * this.RotateSpeed);
	}

	if (this.PressedKeys.RotLeft && !this.PressedKeys.RotRight) {
		this.camera.rotateRight(dt / 1000 * this.RotateSpeed);
	}

	

	this.camera.GetViewMatrix(this.viewMatrix);

	if (this.chef) {
		this.chefKeys['w'] = this.PressedKeys.Forward;
		this.chefKeys['a'] = this.PressedKeys.Left;
		this.chefKeys['s'] = this.PressedKeys.Back;
		this.chefKeys['d'] = this.PressedKeys.Right;
		
		this.chef.update(dt / 1000, this.chefKeys);
	}

	if (this.waiter) {
		this.waiterKeys['w'] = this.PressedKeys.WaiterForward || false;
		this.waiterKeys['a'] = this.PressedKeys.WaiterLeft || false;
		this.waiterKeys['s'] = this.PressedKeys.WaiterBack || false;
		this.waiterKeys['d'] = this.PressedKeys.WaiterRight || false;
		
		this.waiter.update(dt / 1000, this.waiterKeys);
	}
};

LightMapDemoScene.prototype._GenerateShadowMap = function () {
	var gl = this.gl;

	// Set GL state status
	gl.useProgram(this.ShadowMapGenProgram);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.shadowMapCube);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFramebuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.shadowMapRenderbuffer);

	gl.viewport(0, 0, this.textureSize, this.textureSize);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	// Set per-frame uniforms
	gl.uniform2fv(
		this.ShadowMapGenProgram.uniforms.shadowClipNearFar,
		this.shadowClipNearFar
	);
	gl.uniform3fv(
		this.ShadowMapGenProgram.uniforms.pointLightPosition,
		this.lightPosition
	);
	gl.uniformMatrix4fv(
		this.ShadowMapGenProgram.uniforms.mProj,
		gl.FALSE,
		this.shadowMapProj
	);

	for (var i = 0; i < this.shadowMapCameras.length; i++) {
		// Set per light uniforms
		gl.uniformMatrix4fv(
			this.ShadowMapGenProgram.uniforms.mView,
			gl.FALSE,
			this.shadowMapCameras[i].GetViewMatrix(this.shadowMapViewMatrices[i])
		);

		// Set framebuffer destination
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
			this.shadowMapCube,
			0
		);
		gl.framebufferRenderbuffer(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.RENDERBUFFER,
			this.shadowMapRenderbuffer
		);

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Draw meshes
		for (var j = 0; j < this.Meshes.length; j++) {
			// Per object uniforms
			gl.uniformMatrix4fv(
				this.ShadowMapGenProgram.uniforms.mWorld,
				gl.FALSE,
				this.Meshes[j].world
			);

			// Set attributes
			gl.bindBuffer(gl.ARRAY_BUFFER, this.Meshes[j].vbo);
			gl.vertexAttribPointer(
				this.ShadowMapGenProgram.attribs.vPos,
				3, gl.FLOAT, gl.FALSE,
				0, 0
			);
			gl.enableVertexAttribArray(this.ShadowMapGenProgram.attribs.vPos);

			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.Meshes[j].ibo);
			gl.drawElements(gl.TRIANGLES, this.Meshes[j].nPoints, gl.UNSIGNED_SHORT, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}

		if (this.chef) {
			this.chef.draw(gl, {
				uModel: this.ShadowMapGenProgram.uniforms.mWorld
			}, (modelMat, color, uniforms) => {
				gl.uniformMatrix4fv(uniforms.uModel, gl.FALSE, modelMat);
				
				gl.bindBuffer(gl.ARRAY_BUFFER, this.chef.posBuf);
				gl.vertexAttribPointer(
					this.ShadowMapGenProgram.attribs.vPos,
					3, gl.FLOAT, gl.FALSE, 0, 0
				);
				gl.enableVertexAttribArray(this.ShadowMapGenProgram.attribs.vPos);
				
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.chef.idxBuf);
				gl.drawElements(gl.TRIANGLES, this.chef.indexCount, gl.UNSIGNED_SHORT, 0);
			});
		}

		if (this.waiter) {
			this.waiter.draw(gl, {
				uModel: this.ShadowMapGenProgram.uniforms.mWorld
			}, (modelMat, color, uniforms) => {
				gl.uniformMatrix4fv(uniforms.uModel, gl.FALSE, modelMat);
				
				gl.bindBuffer(gl.ARRAY_BUFFER, this.waiter.posBuf);
				gl.vertexAttribPointer(
					this.ShadowMapGenProgram.attribs.vPos,
					3, gl.FLOAT, gl.FALSE, 0, 0
				);
				gl.enableVertexAttribArray(this.ShadowMapGenProgram.attribs.vPos);
				
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waiter.idxBuf);
				gl.drawElements(gl.TRIANGLES, this.waiter.indexCount, gl.UNSIGNED_SHORT, 0);
			});
		}
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
};

LightMapDemoScene.prototype._Render = function () {
	var gl = this.gl;

	// Clear back buffer, set per-frame uniforms
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	gl.useProgram(this.ShadowProgram);
	gl.uniformMatrix4fv(this.ShadowProgram.uniforms.mProj, gl.FALSE, this.projMatrix);
	gl.uniformMatrix4fv(this.ShadowProgram.uniforms.mView, gl.FALSE, this.viewMatrix);
	gl.uniform3fv(this.ShadowProgram.uniforms.pointLightPosition, this.lightPosition);
	gl.uniform2fv(this.ShadowProgram.uniforms.shadowClipNearFar, this.shadowClipNearFar);
	if (this.floatExtension && this.floatLinearExtension) {
		gl.uniform1f(this.ShadowProgram.uniforms.bias, 0.0001);
	} else {
		gl.uniform1f(this.ShadowProgram.uniforms.bias, 0.003);
	}
	gl.uniform1i(this.ShadowProgram.uniforms.lightShadowMap, 0);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.shadowMapCube);

	// Draw meshes
	for (var i = 0; i < this.Meshes.length; i++) {
		// Per object uniforms
		gl.uniformMatrix4fv(
			this.ShadowProgram.uniforms.mWorld,
			gl.FALSE,
			this.Meshes[i].world
		);
		gl.uniform4fv(
			this.ShadowProgram.uniforms.meshColor,
			this.Meshes[i].color
		);

		// Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.Meshes[i].vbo);
		gl.vertexAttribPointer(
			this.ShadowProgram.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			0, 0
		);
		gl.enableVertexAttribArray(this.ShadowProgram.attribs.vPos);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.Meshes[i].nbo);
		gl.vertexAttribPointer(
			this.ShadowProgram.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			0, 0
		);
		gl.enableVertexAttribArray(this.ShadowProgram.attribs.vNorm);		

		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.Meshes[i].ibo);
		gl.drawElements(gl.TRIANGLES, this.Meshes[i].nPoints, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	if (this.chef) {
		this.chef.draw(gl, {
			uModel: this.ShadowProgram.uniforms.mWorld,
			uColor: this.ShadowProgram.uniforms.meshColor
		}, (modelMat, color, uniforms) => {
			gl.uniformMatrix4fv(uniforms.uModel, gl.FALSE, modelMat);
			gl.uniform4fv(uniforms.uColor, new Float32Array([color[0], color[1], color[2], 1.0]));
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.chef.posBuf);
			gl.vertexAttribPointer(
				this.ShadowProgram.attribs.vPos,
				3, gl.FLOAT, gl.FALSE, 0, 0
			);
			gl.enableVertexAttribArray(this.ShadowProgram.attribs.vPos);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.chef.normBuf);
			gl.vertexAttribPointer(
				this.ShadowProgram.attribs.vNorm,
				3, gl.FLOAT, gl.FALSE, 0, 0
			);
			gl.enableVertexAttribArray(this.ShadowProgram.attribs.vNorm);
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.chef.idxBuf);
			gl.drawElements(gl.TRIANGLES, this.chef.indexCount, gl.UNSIGNED_SHORT, 0);
		});
	}

	if (this.waiter) {
		this.waiter.draw(gl, {
			uModel: this.ShadowProgram.uniforms.mWorld,
			uColor: this.ShadowProgram.uniforms.meshColor
		}, (modelMat, color, uniforms) => {
			gl.uniformMatrix4fv(uniforms.uModel, gl.FALSE, modelMat);
			gl.uniform4fv(uniforms.uColor, new Float32Array([color[0], color[1], color[2], 1.0]));
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.waiter.posBuf);
			gl.vertexAttribPointer(
				this.ShadowProgram.attribs.vPos,
				3, gl.FLOAT, gl.FALSE, 0, 0
			);
			gl.enableVertexAttribArray(this.ShadowProgram.attribs.vPos);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.waiter.normBuf);
			gl.vertexAttribPointer(
				this.ShadowProgram.attribs.vNorm,
				3, gl.FLOAT, gl.FALSE, 0, 0
			);
			gl.enableVertexAttribArray(this.ShadowProgram.attribs.vNorm);
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waiter.idxBuf);
			gl.drawElements(gl.TRIANGLES, this.waiter.indexCount, gl.UNSIGNED_SHORT, 0);
		});
	}
};

//
// Event Listeners
//
LightMapDemoScene.prototype._OnResizeWindow = function () {
	var gl = this.gl;

	var targetHeight = window.innerWidth * 9 / 16;

	if (window.innerHeight > targetHeight) {
		// Center vertically
		gl.canvas.width = window.innerWidth;
		gl.canvas.height = targetHeight;
		gl.canvas.style.left = '0px';
		gl.canvas.style.top = (window.innerHeight - targetHeight) / 2 + 'px';
	} else {
		// Center horizontally
		gl.canvas.width = window.innerHeight * 16 / 9;
		gl.canvas.height = window.innerHeight;
		gl.canvas.style.left = (window.innerWidth - (gl.canvas.width)) / 2 + 'px';
		gl.canvas.style.top = '0px';
	}

	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
};

LightMapDemoScene.prototype._OnKeyDown = function (e) {
	switch(e.code) {
		case 'KeyW':
			this.PressedKeys.Forward = true;
			break;
		case 'KeyA':
			this.PressedKeys.Left = true;
			break;
		case 'KeyD':
			this.PressedKeys.Right = true;
			break;
		case 'KeyS':
			this.PressedKeys.Back = true;
			break;
		case 'ArrowUp':
			this.PressedKeys.Up = true;
			break;
		case 'ArrowDown':
			this.PressedKeys.Down = true;
			break;
		case 'ArrowRight':
			this.PressedKeys.RotRight = true;
			break;
		case 'ArrowLeft':
			this.PressedKeys.RotLeft = true;
			break;
		case 'KeyI':
			this.PressedKeys.WaiterForward = true;
			break;
		case 'KeyJ':
			this.PressedKeys.WaiterLeft = true;
			break;
		case 'KeyL':
			this.PressedKeys.WaiterRight = true;
			break;
		case 'KeyK':
			this.PressedKeys.WaiterBack = true;
			break;
		case 'KeyP':
			if (this.waiter) {
				this.waiter.triggerArmAnimation();
			}
			break;
		case 'Space':
			if (this.chef) {
				this.chef.triggerArmAnimation();
			}
			break;
	}
};

LightMapDemoScene.prototype._OnKeyUp = function (e) {
	switch(e.code) {
		case 'KeyW':
			this.PressedKeys.Forward = false;
			break;
		case 'KeyA':
			this.PressedKeys.Left = false;
			break;
		case 'KeyD':
			this.PressedKeys.Right = false;
			break;
		case 'KeyS':
			this.PressedKeys.Back = false;
			break;
		case 'ArrowUp':
			this.PressedKeys.Up = false;
			break;
		case 'ArrowDown':
			this.PressedKeys.Down = false;
			break;
		case 'ArrowRight':
			this.PressedKeys.RotRight = false;
			break;
		case 'ArrowLeft':
			this.PressedKeys.RotLeft = false;
			break;
		case 'KeyI':
			this.PressedKeys.WaiterForward = false;
			break;
		case 'KeyJ':
			this.PressedKeys.WaiterLeft = false;
			break;
		case 'KeyL':
			this.PressedKeys.WaiterRight = false;
			break;
		case 'KeyK':
			this.PressedKeys.WaiterBack = false;
			break;
	}
}; 

LightMapDemoScene.prototype.EndGame = function() {
    if (this.isGameOver) return; // Se já acabou, não faz nada
    
    this.isGameOver = true;
    console.log("FIM DE JOGO! Pontuação Final: " + this.score);

	var menu = document.getElementById('TelaDeEndGame');

	var textoPontos = document.getElementById('final-score-display');
    if (textoPontos) {
        textoPontos.innerText = "Pontuação Final: " + this.score;
    }

    if (menu) {
        menu.style.display = 'block';
    }
  };

// Função que atualiza o relógio na tela
LightMapDemoScene.prototype.UpdateTimerDisplay = function() {
    var timerDiv = document.getElementById('relogio');
    if (!timerDiv) return;

    // Calcula quantos segundos passaram desde o início
    var now = Date.now();
    var diff = Math.floor((now - this.startTime) / 1000);

    // Matemática simples para separar minutos e segundos
    var minutes = Math.floor(diff / 60);
    var seconds = diff % 60;

    // Adiciona o zero na frente se for menor que 10 (ex: "05")
    var minStr = minutes < 10 ? "0" + minutes : minutes;
    var secStr = seconds < 10 ? "0" + seconds : seconds;

    timerDiv.innerText = "Tempo: " + minStr + ":" + secStr;
};


function GetCubeData() {
	return {
		vertices: [
			// Frente
			-1.0, -1.0,  1.0,   1.0, -1.0,  1.0,   1.0,  1.0,  1.0,  -1.0,  1.0,  1.0,
			// Trás
			-1.0, -1.0, -1.0,  -1.0,  1.0, -1.0,   1.0,  1.0, -1.0,   1.0, -1.0, -1.0,
			// Topo
			-1.0,  1.0, -1.0,  -1.0,  1.0,  1.0,   1.0,  1.0,  1.0,   1.0,  1.0, -1.0,
			// Base
			-1.0, -1.0, -1.0,   1.0, -1.0, -1.0,   1.0, -1.0,  1.0,  -1.0, -1.0,  1.0,
			// Direita
			 1.0, -1.0, -1.0,   1.0,  1.0, -1.0,   1.0,  1.0,  1.0,   1.0, -1.0,  1.0,
			// Esquerda
			-1.0, -1.0, -1.0,  -1.0, -1.0,  1.0,  -1.0,  1.0,  1.0,  -1.0,  1.0, -1.0
		],
		indices: [
			0,  1,  2,      0,  2,  3,
			4,  5,  6,      4,  6,  7,
			8,  9,  10,     8,  10, 11,
			12, 13, 14,     12, 14, 15,
			16, 17, 18,     16, 18, 19,
			20, 21, 22,     20, 22, 23
		],
		normals: [
			 0.0,  0.0,  1.0,   0.0,  0.0,  1.0,   0.0,  0.0,  1.0,   0.0,  0.0,  1.0,
			 0.0,  0.0, -1.0,   0.0,  0.0, -1.0,   0.0,  0.0, -1.0,   0.0,  0.0, -1.0,
			 0.0,  1.0,  0.0,   0.0,  1.0,  0.0,   0.0,  1.0,  0.0,   0.0,  1.0,  0.0,
			 0.0, -1.0,  0.0,   0.0, -1.0,  0.0,   0.0, -1.0,  0.0,   0.0, -1.0,  0.0,
			 1.0,  0.0,  0.0,   1.0,  0.0,  0.0,   1.0,  0.0,  0.0,   1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,  -1.0,  0.0,  0.0,  -1.0,  0.0,  0.0,  -1.0,  0.0,  0.0
		]
	};
}

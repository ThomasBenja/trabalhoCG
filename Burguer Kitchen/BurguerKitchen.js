'use strict';



var BurguerKitchen = function (gl) {
	this.gl = gl;

	this.chef = null;
	this.chefKeys = {};

	this.waiter = null;
	this.waiterKeys = {};

	this.score = 0;
	
	this.isGameStarted = false; 
    this.startTime = 0;

	this.gameDuration = 300; //em segundos
    this.isGameOver = false;
};


BurguerKitchen.prototype.UpdateOrderUI = function() {
    var div = document.getElementById("pedido");
    if (!div) return;

    div.innerHTML = "<b>Pedido:</b><br>" +
        this.currentRecipe.map(ing => {
            return this.deliveredIngredients.includes(ing)
                ? "✔️ " + ing
                : "⬜ " + ing;
        }).join("<br>");
};

BurguerKitchen.prototype.CheckRecipeComplete = function() {
    if (this.deliveredIngredients.length !== this.currentRecipe.length) return;

    console.log("LANCHES COMPLETO!");

    // Pontuação
    this.score += 10;
    var placar = document.getElementById("placar");
    if (placar) placar.innerText = "Pontos: " + this.score;

    // Próximo pedido
    this.currentRecipeIndex++;

    if (this.currentRecipeIndex >= this.recipes.length) {
        console.log("Todos os pedidos concluídos!");
        return;
    }

    this.currentRecipe = [...this.recipes[this.currentRecipeIndex]];
    this.deliveredIngredients = [];

    this.UpdateOrderUI();
};



BurguerKitchen.prototype.Load = function (cb) {
	console.log('Loading demo scene');

	// Carrega a música
	this.bgMusic = new Audio('jazz.mp3'); 
	this.bgMusic.loop = true; 
	this.bgMusic.volume = 0.7; 

	var botao = document.getElementById("BotaoInicio");
    var me = this;

    if (botao) {
        botao.addEventListener("click", function() {
            me.bgMusic.play();
        });
    }

	this.recipes = [
    ["PaoBase", "Carne", "Queijo", "PaoTopo"],
    ["PaoBase", "Salada", "Tomate", "PaoTopo"],
    ["PaoBase", "Carne", "Salada", "Tomate", "PaoTopo"]
	];

	this.currentRecipeIndex = 0;
	this.currentRecipe = [...this.recipes[this.currentRecipeIndex]];
	this.deliveredIngredients = [];

	var me = this;

	//duas cameras
	this.isFirstPerson = false; 
    this.cameraTogglePressed = false;

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



		
		for (var i = 0; i < loadResults.Models.RoomModel.meshes.length; i++) {
			var mesh = loadResults.Models.RoomModel.meshes[i];
			switch (mesh.name) {
				case 'TableMesh':
					me.TableMesh = new Model(
						me.gl, mesh.vertices, [].concat.apply([], mesh.faces),
						mesh.normals, vec4.fromValues(0.75, 0.75, 0.85, 1.0)
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
						//cor das paredes
						mesh.normals, vec4.fromValues(1.0, 1, 0.82, 1.0)
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
            vec4.fromValues(0.75, 0.75, 0.85, 1.0) 
        );

		mat4.translate(me.CounterMesh.world, me.CounterMesh.world, vec3.fromValues(-4.49, 3.5, 0.5));
        mat4.scale(me.CounterMesh.world, me.CounterMesh.world, vec3.fromValues(0.5, 1.5, 0.5));

		
		me.WindowObject = new WindowModel(me.gl, 'janela.png'); 

		
		me.WindowPosition = [0.0, -4.9, 1.75];
		me.WindowPosition2 = [0.0,  4.9, 1.75];

	
		me.DoorObject = new DoorModel(me.gl, "porta.png");

		me.DoorPosition = [-4.9, 0.5, 1.4];
		me.DoorPosition2 = [4.9, 1.6, 1.4];

		me.Pratileira = new PratileiraModel(me.gl,'pratileira.png');
		me.PratileiraPosition = [-4.8,-2.6,2];
		me.Pratileira2 = new PratileiraModel(me.gl,'pratileira.png');
		me.Pratileira2Position = [-4.8,-2.6,0.7];


		me.Geladeira = new GeladeiraModel(me.gl,'geladeira.png');
		me.GeladeiraPosition = [-3.98,3.6,0.1];

		me.Quadro = new QuadroModel(me.gl, 'quadro.png');
		me.QuadroPosition = [4.8, -0.8, 1.65];

		me.Poster = new PosterModel(me.gl, 'poster.jpg');
		me.PosterPosition = [4.8, -3.4, 1.7];

		me.Teto = new TetoModel(me.gl, 'teto.png');
		me.TetoPosition = [0, 0, 2.99];

		me.Piso = new PisoModel(me.gl, 'piso.png');
		me.PisoPosition = [0, 0, 0.0001];


		if (loadResults.OBJModels) {
			var obj = loadResults.OBJModels;
			
			// Base do Pão
			if (obj.PaoBase) {
				me.HamburguerMesh = new Model(
					me.gl,
					obj.PaoBase.vertices,
					obj.PaoBase.indices,
					obj.PaoBase.normals,
					vec4.fromValues(0.8, 0.5, 0.2, 1)
				);
				mat4.translate(me.HamburguerMesh.world, me.HamburguerMesh.world, vec3.fromValues(3, -0.8, 1.15));
				mat4.rotate(me.HamburguerMesh.world, me.HamburguerMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.HamburguerMesh.world, me.HamburguerMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			// Salada
			if(obj.Salada) {
				me.SaladaMesh = new Model(me.gl, obj.Salada.vertices, obj.Salada.indices, obj.Salada.normals, vec4.fromValues(0.63, 0.79, 0.21, 1.0));
				mat4.translate(me.SaladaMesh.world, me.SaladaMesh.world, vec3.fromValues(3, -1.5, 1.15));
				mat4.rotate(me.SaladaMesh.world, me.SaladaMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.SaladaMesh.world, me.SaladaMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			// Carne do Hamburguer
			if(obj.Carne) {
				me.CarneMesh = new Model(me.gl, obj.Carne.vertices, obj.Carne.indices, obj.Carne.normals, vec4.fromValues(0.38, 0.25, 0.25, 1));
				mat4.translate(me.CarneMesh.world, me.CarneMesh.world, vec3.fromValues(3, -0.1, 1.15));
				mat4.rotate(me.CarneMesh.world, me.CarneMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.CarneMesh.world, me.CarneMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			// Queijo Mussarela
			if(obj.Queijo) {
				me.QueijoMesh = new Model(me.gl, obj.Queijo.vertices, obj.Queijo.indices, obj.Queijo.normals, vec4.fromValues(0.93, 0.60, 0.04, 1.0));
				mat4.translate(me.QueijoMesh.world, me.QueijoMesh.world, vec3.fromValues(-4.3, 2.8, 0.97));
				mat4.rotate(me.QueijoMesh.world, me.QueijoMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.QueijoMesh.world, me.QueijoMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			// Tomate
			if(obj.Tomate) {
				me.TomateMesh = new Model(me.gl, obj.Tomate.vertices, obj.Tomate.indices, obj.Tomate.normals, vec4.fromValues(1.0, 0.388, 0.278, 1.0));
				mat4.translate(me.TomateMesh.world, me.TomateMesh.world, vec3.fromValues(-4.3, 3.5, 0.9));
				mat4.rotate(me.TomateMesh.world, me.TomateMesh.world, Math.PI/2, vec3.fromValues(1, 0, 0)); // Rotação em Z: 0 graus
				mat4.scale(me.TomateMesh.world, me.TomateMesh.world, vec3.fromValues(0.15, 0.1, 0.15));
			}
			// Tampa do pão
			if(obj.PaoTopo) {
				me.PaoTopoMesh = new Model(me.gl, obj.PaoTopo.vertices, obj.PaoTopo.indices, obj.PaoTopo.normals, vec4.fromValues(0.8, 0.5, 0.2, 1));
				mat4.translate(me.PaoTopoMesh.world, me.PaoTopoMesh.world, vec3.fromValues(-4.3, 4, 0.9));
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

		me.chef = new Chef(me.gl, me.ShadowProgram);
        me.chef.position = [0, 0, 0]; // Posição inicial
        me.chef.scale = 1.0;
		
		
        me.Interactables = [];
        me.chefHandItem = null;

       
        var registerStockItem = function(mesh, objData, color, name) {
            if (mesh && objData) {
                // Adiciona o mesh visual na tela
                me.Meshes.push(mesh);

                // Adiciona na lista de lógica
                me.Interactables.push({ 
                    type: 'stock',
                    mesh: mesh,
                    name: name,
                    data: objData,     // Dados para clonagem
                    color: color,
                    originalScale: vec3.fromValues(0.15, 0.1, 0.15) 
                });
            }
        };

        if (loadResults.OBJModels) {
             var obj = loadResults.OBJModels;
             
             registerStockItem(me.HamburguerMesh, obj.PaoBase, [0.8, 0.5, 0.2, 1], 'PaoBase');
             registerStockItem(me.CarneMesh,      obj.Carne,   [0.38, 0.25, 0.25, 1], 'Carne');
             registerStockItem(me.PaoTopoMesh,    obj.PaoTopo, [0.8, 0.5, 0.2, 1], 'PaoTopo');
             registerStockItem(me.QueijoMesh,     obj.Queijo,  [0.93, 0.60, 0.04, 1.0], 'Queijo');
             registerStockItem(me.SaladaMesh,     obj.Salada,  [0.63, 0.79, 0.21, 1.0], 'Salada');
             registerStockItem(me.TomateMesh,     obj.Tomate,  [1.0, 0.388, 0.278, 1.0], 'Tomate');
        }
        
        // Mesh dos ingredientes
        if (me.CarneMeshIng) me.MeshInges.push(me.CarneMeshIng);
        if (me.PaoBaseMeshIng) me.MeshInges.push(me.PaoBaseMeshIng);
        if (me.PaoTopoMeshIng) me.MeshInges.push(me.PaoTopoMeshIng);
        if (me.QueijoMeshIng) me.MeshInges.push(me.QueijoMeshIng);
        if (me.SaladaMeshIng) me.MeshInges.push(me.SaladaMeshIng);
        if (me.TomateMeshIng) me.MeshInges.push(me.TomateMeshIng);



	
		//Shaders
		
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

		
		// Framebuffers e Textures
		
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

		// Valores Lógicos
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
			// Positivo X
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(1, 0, 0)),
				vec3.fromValues(0, -1, 0)
			),
			// Negativo X
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(-1, 0, 0)),
				vec3.fromValues(0, -1, 0)
			),
			// Positivo Y
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, 1, 0)),
				vec3.fromValues(0, 0, 1)
			),
			// Negativo Y
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, -1, 0)),
				vec3.fromValues(0, 0, -1)
			),
			// Positivo o
			new Camera(
				me.lightPosition,
				vec3.add(vec3.create(), me.lightPosition, vec3.fromValues(0, 0, 1)),
				vec3.fromValues(0, -1, 0)
			),
			// Negativo z
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
		me.waiter.position = [4, 3, 0]; 
		me.waiter.scale = 0.75;
		me.waiter.baseRotation = [0, 0, 90];
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


            document.getElementById('pedido').style.display = 'block';
			document.getElementById('placar').style.display = 'block';
            document.getElementById('relogio').style.display = 'block';
            // Destrava o jogo
            me.isGameStarted = true;
			
            
            // Inicia o relógio para não contar o tempo que ficou no menu
            me.startTime = Date.now();
			me.UpdateOrderUI();
            
            console.log("Jogo Iniciado!");
        };
    }

	this.currentRecipe = [...this.recipes[this.currentRecipeIndex]];
	this.deliveredIngredients = [];
	this.UpdateOrderUI();

	// Logica do menu de creditos
    
    var btnCreditos = document.getElementById("Creditos");
    var btnVoltarCred = document.getElementById("BotaoVoltarCreditos");
    var telaCreditos = document.getElementById("TelaDeCreditos");
    var telaInicio = document.getElementById("TelaDeInicio");
	var TelaDeEndGame = document.getElementById("TelaDeEndGame");

    if (btnCreditos) {
        btnCreditos.addEventListener("click", function() {
            telaCreditos.style.display = "flex"; 
            telaInicio.style.display = "none";   
			TelaDeEndGame.style.display = "none";
        });
    }


    if (btnVoltarCred) {
        btnVoltarCred.addEventListener("click", function() {
            telaCreditos.style.display = "none"; 
			TelaDeEndGame.style.display = "block";
        });
    }

};

BurguerKitchen.prototype.Unload = function () {
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

BurguerKitchen.prototype.Begin = function () {
	console.log('Beginning demo scene');

	var me = this;

	
	this.__ResizeWindowListener = this._OnResizeWindow.bind(this);
	this.__KeyDownWindowListener = this._OnKeyDown.bind(this);
	this.__KeyUpWindowListener = this._OnKeyUp.bind(this);

	AddEvent(window, 'resize', this.__ResizeWindowListener);
	AddEvent(window, 'keydown', this.__KeyDownWindowListener);
	AddEvent(window, 'keyup', this.__KeyUpWindowListener);
	
	
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

BurguerKitchen.prototype.AttemptInteraction = function() {
    var chefPos = vec3.fromValues(this.chef.position[0], this.chef.position[1], this.chef.position[2]);
    
  
    if (this.chefHandItem) {
        
      
        if (this.waiter) {
            var waiterPos = vec3.fromValues(this.waiter.position[0], this.waiter.position[1], this.waiter.position[2]);
            var distToWaiter = vec3.distance(chefPos, waiterPos);

            // Se estiver perto (menos de 2.0 unidades)
            if (distToWaiter < 2.0) {
                console.log("Entregou " + this.chefHandItem.name + " para o garçom!");

                //  Remove o item da lista de desenho (faz ele SUMIR da tela)
                var index = this.Meshes.indexOf(this.chefHandItem.mesh);
                if (index > -1) {
                    this.Meshes.splice(index, 1);
                }

                //  Limpa a mão do chefe

				var ingredientName = this.chefHandItem.name.replace("_Clone", "");

				// ✔️ Só aceita se estiver no pedido
				if (
					this.currentRecipe.includes(ingredientName) &&
					!this.deliveredIngredients.includes(ingredientName)
				) {
					console.log("Ingrediente correto:", ingredientName);
					this.deliveredIngredients.push(ingredientName);
				} else {
					console.log("Ingrediente errado ou repetido:", ingredientName);
				}

				// Remove o item da cena
				var index = this.Meshes.indexOf(this.chefHandItem.mesh);
				if (index > -1) {
					this.Meshes.splice(index, 1);
				}

				// Limpa a mão
				this.chefHandItem = null;

				// Atualiza HUD e verifica se completou o lanche
				this.UpdateOrderUI();
				this.CheckRecipeComplete();

				// Sai para não soltar no chão
				return;


                // Sai da função (não deixa soltar no chão)
                return;
            }
        }

        // Se não entregou pro garçom dropa no chao
        console.log("Soltou " + this.chefHandItem.name + " no chão.");
        this.chefHandItem.isHeld = false;
        this.chefHandItem = null;
        return; 
    }

    //SE A MÃO ESTIVER VAZIA TENTA PEGAR DO ESTOQUE
    var pickupRadius = 1.5; 
    var closestDist = 999;
    var stockToUse = null;

    for (var i = 0; i < this.Interactables.length; i++) {
        var stockItem = this.Interactables[i];
        
        var stockPos = vec3.create();
        mat4.getTranslation(stockPos, stockItem.mesh.world);

        var dist = vec3.distance(chefPos, stockPos);

        if (dist < pickupRadius && dist < closestDist) {
            closestDist = dist;
            stockToUse = stockItem;
        }
    }

    // Cria o clone se achou estoque
    if (stockToUse) {
        console.log("Pegou novo: " + stockToUse.name);
        
        var newMesh = new Model(
            this.gl, 
            stockToUse.data.vertices, 
            stockToUse.data.indices, 
            stockToUse.data.normals, 
            vec4.fromValues(stockToUse.color[0], stockToUse.color[1], stockToUse.color[2], stockToUse.color[3])
        );

        this.Meshes.push(newMesh);

        var newItem = {
            mesh: newMesh,
            name: stockToUse.name + "_Clone",
            isHeld: true,
            originalScale: stockToUse.originalScale
        };

        this.chefHandItem = newItem;
        if (this.chef) this.chef.triggerArmAnimation();
    }
};



BurguerKitchen.prototype.End = function () {
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


BurguerKitchen.prototype.SetIngredientPosition = function (name, x, y, z, scale) {
	var mesh = this[name + 'Mesh'];
	if (!mesh) return false;

	
	mat4.identity(mesh.world);
	mat4.translate(mesh.world, mesh.world, vec3.fromValues(x, y, z));
	if (typeof scale !== 'undefined' && scale !== null) {
		mat4.scale(mesh.world, mesh.world, vec3.fromValues(scale, scale, scale));
	}
	return true;
};


BurguerKitchen.prototype.RotateIngredient = function (name, axis, angleRadians) {
	var mesh = this[name + 'Mesh'];
	if (!mesh) return false;

	mat4.rotate(mesh.world, mesh.world, angleRadians, axis);
	return true;
};


BurguerKitchen.prototype._Update = function (dt) {
	//ve se o jogo acabou pra travar ele
    if (!this.isGameStarted || this.isGameOver) {
        return; 
    }

    var now = Date.now();
    var secondsPassed = Math.floor((now - this.startTime) / 1000);

	this.UpdateTimerDisplay();

	if (secondsPassed >= this.gameDuration) {
        this.EndGame();
        return; 
    }

    var tamanhoDaSala = 4.20;  // Limite horizontal 
    var alturaDosOlhos = 2.0; // Altura fixa do chão 

    // TRAVAR PAREDES LATERAIS 
    if (this.camera.position[0] < -tamanhoDaSala) {
        this.camera.position[0] = -tamanhoDaSala;
    }
    // Se tentar sair pela direita
    if (this.camera.position[0] > tamanhoDaSala) {
        this.camera.position[0] = tamanhoDaSala;
    }

    //TRAVAR PAREDES FUNDO 
    if (this.camera.position[1] < -tamanhoDaSala) {
        this.camera.position[1] = -tamanhoDaSala;
    }
    // Se tentar sair pela frente
    if (this.camera.position[1] > tamanhoDaSala) {
        this.camera.position[1] = tamanhoDaSala;
    }

    // FIXAR A ALTURA
    this.camera.position[2] = alturaDosOlhos;


	if (this.PressedKeys.Forward && !this.PressedKeys.Back) {
		this.camera.moveForward(dt / 1000 * this.MoveForwardSpeed);
	}

	if (this.PressedKeys.Back && !this.PressedKeys.Forward) {
		this.camera.moveForward(-dt / 1000 * this.MoveForwardSpeed);
	}

	
	if (this.PressedKeys.RotRight && !this.PressedKeys.RotLeft) {
		this.camera.rotateRight(-dt / 1000 * this.RotateSpeed);
	}

	if (this.PressedKeys.RotLeft && !this.PressedKeys.RotRight) {
		this.camera.rotateRight(dt / 1000 * this.RotateSpeed);
	}

    
    if (this.isFirstPerson && this.chef) {
        
        var p = this.chef.position; 
        var angle = this.chef.rotation;

        var eyeHeight = 1.7; 
        var frontOffset = 0.1; 
        var lookDist = 10.0;   

        // direção calculada igual ao movimento do chef
        var dirX = -Math.sin(angle);
        var dirY = Math.cos(angle);
        
		//posicao camera
        var eyeX = p[0] + (dirX * frontOffset);
        var eyeY = p[1] + (dirY * frontOffset);
        var eyeZ = p[2] + eyeHeight; 

        var eye = vec3.fromValues(eyeX, eyeY, eyeZ);

        var centerX = eyeX + (dirX * lookDist);
        var centerY = eyeY + (dirY * lookDist);
        var centerZ = eyeZ; 

        var center = vec3.fromValues(centerX, centerY, centerZ);

    
        var up = vec3.fromValues(0, 0, 1); 

        // Aplica a câmera
        mat4.lookAt(this.viewMatrix, eye, center, up);

    } else {
        // Câmera normal
        this.camera.GetViewMatrix(this.viewMatrix);
    }

	if (this.chef) {
    this.chefKeys['w'] = this.PressedKeys.ChefForward || false;
    this.chefKeys['a'] = this.PressedKeys.ChefLeft || false;
    this.chefKeys['s'] = this.PressedKeys.ChefBack || false;
    this.chefKeys['d'] = this.PressedKeys.ChefRight || false;
    
    this.chef.update(dt / 1000, this.chefKeys);
}

	if (this.waiter) {
		this.waiterKeys['w'] = this.PressedKeys.WaiterForward || false;
		this.waiterKeys['a'] = this.PressedKeys.WaiterLeft || false;
		this.waiterKeys['s'] = this.PressedKeys.WaiterBack || false;
		this.waiterKeys['d'] = this.PressedKeys.WaiterRight || false;
		
		this.waiter.update(dt / 1000, this.waiterKeys);
	}

	if (this.chefKeys['C'] || this.chefKeys['c']) { 
        if (!this.cameraTogglePressed) {
            this.isFirstPerson = !this.isFirstPerson; 
            this.cameraTogglePressed = true; 
        }
    } else {
        this.cameraTogglePressed = false; 
    }
	
	//Atualizacao dos itens segurados
    if (this.chefHandItem) {
        var item = this.chefHandItem;
        var mesh = item.mesh;

        mat4.identity(mesh.world);

        // Move para a posição do Chef
        mat4.translate(mesh.world, mesh.world, vec3.fromValues(
            this.chef.position[0], 
            this.chef.position[1], 
            this.chef.position[2]
        ));

        // Rotação do Chef
        mat4.rotateZ(mesh.world, mesh.world, this.chef.rotation);

        // Ajuste Fino na mão
        mat4.translate(mesh.world, mesh.world, vec3.fromValues(0, 0.8, 1.0)); 

        // Escala
        mat4.scale(mesh.world, mesh.world, item.originalScale);
    }

};





BurguerKitchen.prototype._GenerateShadowMap = function () {
	var gl = this.gl;

	
	gl.useProgram(this.ShadowMapGenProgram);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.shadowMapCube);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFramebuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.shadowMapRenderbuffer);

	gl.viewport(0, 0, this.textureSize, this.textureSize);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	
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
		
		gl.uniformMatrix4fv(
			this.ShadowMapGenProgram.uniforms.mView,
			gl.FALSE,
			this.shadowMapCameras[i].GetViewMatrix(this.shadowMapViewMatrices[i])
		);

		
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

		
		for (var j = 0; j < this.Meshes.length; j++) {
			
			gl.uniformMatrix4fv(
				this.ShadowMapGenProgram.uniforms.mWorld,
				gl.FALSE,
				this.Meshes[j].world
			);

			
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

BurguerKitchen.prototype._Render = function () {
	var gl = this.gl;

	
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

	
	this.gl.enable(this.gl.BLEND);
	// Define como a transparência funciona (usa o Alpha da imagem)
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

	for (var i = 0; i < this.Meshes.length; i++) {
		
		gl.uniformMatrix4fv(
			this.ShadowProgram.uniforms.mWorld,
			gl.FALSE,
			this.Meshes[i].world
		);
		gl.uniform4fv(
			this.ShadowProgram.uniforms.meshColor,
			this.Meshes[i].color
		);

		
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


	if (this.WindowModel) {


		var winModelMat = mat4.create();

		mat4.translate(winModelMat, winModelMat, this.WindowPosition);


		mat4.scale(winModelMat, winModelMat, [1.8, 0.5, 1]); 

		this.gl.disable(this.gl.CULL_FACE);

		this.WindowModel.draw(this.viewMatrix, this.projMatrix, winModelMat);

		this.gl.enable(this.gl.CULL_FACE);

		var winMat2 = mat4.create();
	
		mat4.translate(winMat2, winMat2, this.WindowPosition2); 
	
		mat4.scale(winMat2, winMat2, [1.8, 0.5, 1]); 
		this.gl.disable(this.gl.CULL_FACE);
		this.WindowModel.draw(this.viewMatrix, this.projMatrix, winMat2);
		this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.DoorObject) {

    	var doorMat = mat4.create();

 
    	mat4.translate(doorMat, doorMat, this.DoorPosition);

    	mat4.scale(doorMat, doorMat, [1.5, 2, 1.5]); 

   
    	this.gl.disable(this.gl.CULL_FACE);
    	this.DoorObject.draw(this.viewMatrix, this.projMatrix, doorMat);
    	this.gl.enable(this.gl.CULL_FACE);

		var doorMat2 = mat4.create();

 
    	mat4.translate(doorMat2, doorMat2, this.DoorPosition2);

    	mat4.scale(doorMat2, doorMat2, [1.5, 2, 1.5]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.DoorObject.draw(this.viewMatrix, this.projMatrix, doorMat2);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Pratileira) {

    	var Pratileira = mat4.create();

    	mat4.translate(Pratileira, Pratileira, this.PratileiraPosition);

    	mat4.scale(Pratileira, Pratileira, [2.5, 1.7, 0.7]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Pratileira.draw(this.viewMatrix, this.projMatrix, Pratileira);
    	this.gl.enable(this.gl.CULL_FACE);

		var Pratileira2 = mat4.create();

    	mat4.translate(Pratileira2, Pratileira2, this.Pratileira2Position);

    	mat4.scale(Pratileira2, Pratileira2, [2.5, 1.7, 0.7]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Pratileira2.draw(this.viewMatrix, this.projMatrix, Pratileira2);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Geladeira) {

    	var Geladeira = mat4.create();

    	mat4.translate(Geladeira, Geladeira, this.GeladeiraPosition);

    	mat4.scale(Geladeira, Geladeira, [1.25, 1.85, 3.8]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Geladeira.draw(this.viewMatrix, this.projMatrix, Geladeira);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Quadro) {

    	var Quadro = mat4.create();

    	mat4.translate(Quadro, Quadro, this.QuadroPosition);

    	mat4.scale(Quadro, Quadro, [1.3, 1.3, 1.3]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Quadro.draw(this.viewMatrix, this.projMatrix, Quadro);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Poster) {

    	var Poster = mat4.create();

    	mat4.translate(Poster, Poster, this.PosterPosition);

    	mat4.scale(Poster, Poster, [0.7, -0.7, 0.7]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Poster.draw(this.viewMatrix, this.projMatrix, Poster);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Teto) {

    	var Teto = mat4.create();

    	mat4.translate(Teto, Teto, this.TetoPosition);

    	mat4.scale(Teto, Teto, [5, 5, 5]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Teto.draw(this.viewMatrix, this.projMatrix, Teto);
    	this.gl.enable(this.gl.CULL_FACE);
	}

	if (this.Piso) {

    	var Piso = mat4.create();

    	mat4.translate(Piso, Piso, this.PisoPosition);

    	mat4.scale(Piso, Piso, [5.5, 5.5, 5.5]); 

    	this.gl.disable(this.gl.CULL_FACE);
    	this.Piso.draw(this.viewMatrix, this.projMatrix, Piso);
    	this.gl.enable(this.gl.CULL_FACE);
	}
};


BurguerKitchen.prototype._OnResizeWindow = function () {
	var gl = this.gl;

	var targetHeight = window.innerWidth * 9 / 16;

	if (window.innerHeight > targetHeight) {
		
		gl.canvas.width = window.innerWidth;
		gl.canvas.height = targetHeight;
		gl.canvas.style.left = '0px';
		gl.canvas.style.top = (window.innerHeight - targetHeight) / 2 + 'px';
	} else {
		
		gl.canvas.width = window.innerHeight * 16 / 9;
		gl.canvas.height = window.innerHeight;
		gl.canvas.style.left = (window.innerWidth - (gl.canvas.width)) / 2 + 'px';
		gl.canvas.style.top = '0px';
	}

	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
};

BurguerKitchen.prototype._OnKeyDown = function (e) {
	switch(e.code) {
		case 'KeyW':
			this.PressedKeys.ChefForward = true;
			break;
		case 'KeyA':
			this.PressedKeys.ChefLeft = true;
			break;
		case 'KeyD':
			this.PressedKeys.ChefRight = true;
			break;
		case 'KeyS':
			this.PressedKeys.ChefBack = true;
			break;
		case 'KeyC': 
            this.chefKeys['C'] = true; 
            break;
		case 'ArrowUp':
    	this.PressedKeys.Forward = true; 
    	break;
		case 'ArrowDown':
    	this.PressedKeys.Back = true;    
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
				this.AttemptInteraction();
			}
			break;
	}
};

BurguerKitchen.prototype._OnKeyUp = function (e) {
	switch(e.code) {
		case 'KeyW':
			this.PressedKeys.ChefForward = false;
			break;
		case 'KeyA':
			this.PressedKeys.ChefLeft = false;
			break;
		case 'KeyD':
			this.PressedKeys.ChefRight = false;
			break;
		case 'KeyS':
			this.PressedKeys.ChefBack = false;
			break;
		case 'KeyC': 
            this.chefKeys['C'] = false; 
            break;
		case 'ArrowUp':
			this.PressedKeys.Forward = false;
			break;
		case 'ArrowDown':
			this.PressedKeys.Back = false;
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

BurguerKitchen.prototype.EndGame = function() {
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

BurguerKitchen.prototype.UpdateTimerDisplay = function() {
    var timerDiv = document.getElementById('relogio');
    if (!timerDiv) return;

    // Calcula quantos segundos passaram desde o início
    var now = Date.now();
    var diff = Math.floor((now - this.startTime) / 1000);
	var cronometro = this.gameDuration - diff;

    var minutes = Math.floor(cronometro / 60);
    var seconds = cronometro % 60;

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

// codigo de textura

//Shaders para textura 
var texVS = `
attribute vec3 a_Position;
attribute vec2 a_TexCoord;
uniform mat4 u_WorldViewProjection;
varying vec2 v_TexCoord;
void main() {
    gl_Position = u_WorldViewProjection * vec4(a_Position, 1.0);
    v_TexCoord = a_TexCoord;
}`;

var texFS = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Sampler;
void main() {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
}`;

// Classe Especializada para Modelos com Textura
function WindowModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;
    
    // Compilar Shaders
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS);
    gl.compileShader(vShader);
    
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS);
    gl.compileShader(fShader);
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);

    // Carregar Imagem
    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        _this.texture = texture;
    };
    image.src = imagePath;


var vertices = new Float32Array([
    // X (Varia)    Y (ZERO/Fixo)    Z (Altura)       U, V
    
    // 1. Esquerda - Baixo
    -1.0,           0.0,            -1.0,             0.0, 0.0,
    
    // 2. Direita - Baixo
     1.0,           0.0,            -1.0,             1.0, 0.0,
    
    // 3. Direita - Cima
     1.0,           0.0,             1.0,             1.0, 1.0,
    
    // 4. Esquerda - Cima
    -1.0,           0.0,             1.0,             0.0, 1.0
]);

    var indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    
    this.indexCount = indices.length;
}

WindowModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);


    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);


    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    
    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Pos);

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
    gl.enableVertexAttribArray(a_Tex);

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    gl.uniform1i(u_Sampler, 0);


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
};

function DoorModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;

	var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS);
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);

    var vertices = new Float32Array([
        // X      Y      Z        U    V
        0.0,   -1.0,   -1.0,     0.0, 0.0, 
        0.0,    1.0,   -1.0,     1.0, 0.0, 
        0.0,    1.0,    1.0,     1.0, 1.0, 
        0.0,   -1.0,    1.0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;


    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        
        _this.texture = texture; 
    };
    image.src = imagePath; 
};


DoorModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    
    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if (a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if (a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};



function PratileiraModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;

    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS); 
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);

	var vertices = new Float32Array([
        // X      Y      Z        U    V
        0.0,   -1.0,   -1.0,     0.0, 0.0,
        0.0,    1.0,   -1.0,     1.0, 0.0, 
        0.0,    1.0,    1.0,     1.0, 1.0, 
        0.0,   -1.0,    1.0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};

PratileiraModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
   
    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};


function QuadroModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;



    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS); 
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);


	var vertices = new Float32Array([
        // X      Y      Z        U    V
        0.0,   -1.0,   -1.0,     0.0, 0.0, 
        0.0,    1.0,   -1.0,     1.0, 0.0, 
        0.0,    1.0,    1.0,     1.0, 1.0, 
        0.0,   -1.0,    1.0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};

QuadroModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    

    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};

function TetoModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;


    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS);
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS);
    gl.compileShader(fShader);


    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);


	var vertices = new Float32Array([
        // X      Y      Z        U    V
        -1.0,   -1.0,   0,     0.0, 0.0, 
        -1.0,    1.0,   0,     1.0, 0.0, 
        1.0,    1.0,    0,     1.0, 1.0, 
        1.0,   -1.0,    0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

  
    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};


TetoModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;

    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};

function PisoModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;


    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS); 
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);



	var vertices = new Float32Array([
        // X      Y      Z        U    V
        -1.0,   -1.0,   0,     0.0, 0.0, 
        -1.0,    1.0,   0,     1.0, 0.0, 
        1.0,    1.0,    0,     1.0, 1.0, 
        1.0,   -1.0,    0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;


    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};


PisoModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return;

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;

    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};

function PosterModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;

    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS);
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);



	var vertices = new Float32Array([
        // X      Y      Z        U    V
        0.0,   -1.0,   -1.0,     0.0, 0.0, 
        0.0,    1.0,   -1.0,     1.0, 0.0, 
        0.0,    1.0,    1.0,     1.0, 1.0, 
        0.0,   -1.0,    1.0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};


PosterModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    
    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};

function GeladeiraModel(gl, imagePath) {
    this.gl = gl;
    this.texture = null;


    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, texVS); 
    gl.compileShader(vShader);

    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, texFS); 
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);



	var vertices = new Float32Array([
        // X      Y      Z        U    V
        0.0,   -1.0,   -1.0,     0.0, 0.0,
        0.0,    1.0,   -1.0,     1.0, 0.0, 
        0.0,    1.0,    1.0,     1.0, 1.0, 
        0.0,   -1.0,    1.0,     0.0, 1.0  
    ]);

    var indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

  
    var texture = gl.createTexture();
    var image = new Image();
    var _this = this;
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        _this.texture = texture;
    };
    image.src = imagePath;
};


GeladeiraModel.prototype.draw = function(viewMatrix, projMatrix, modelMatrix) {
    if (!this.texture) return; 

    var gl = this.gl;
    gl.useProgram(this.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, projMatrix, viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    
    var a_Pos = gl.getAttribLocation(this.program, "a_Position");
    if(a_Pos >= 0) {
        gl.vertexAttribPointer(a_Pos, 3, gl.FLOAT, false, FSIZE * 5, 0);
        gl.enableVertexAttribArray(a_Pos);
    }

    var a_Tex = gl.getAttribLocation(this.program, "a_TexCoord");
    if(a_Tex >= 0) {
        gl.vertexAttribPointer(a_Tex, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
        gl.enableVertexAttribArray(a_Tex);
    }

    var u_MVP = gl.getUniformLocation(this.program, "u_WorldViewProjection");
    if (u_MVP) gl.uniformMatrix4fv(u_MVP, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    if (u_Sampler) gl.uniform1i(u_Sampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_BYTE, 0);
};
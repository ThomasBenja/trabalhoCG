precision mediump float;

uniform mat4 mProj;
uniform mat4 mView;
uniform mat4 mWorld;

attribute vec3 vPos;
attribute vec3 vNorm;
attribute vec2 vTexCoord; // <--- O Javascript PRECISA enviar isso

varying vec3 fPos;
varying vec3 fNorm;
varying vec2 fTexCoord;   // <--- Envia para o Fragment Shader

void main()
{
	fPos = (mWorld * vec4(vPos, 1.0)).xyz;
	fNorm = (mWorld * vec4(vNorm, 0.0)).xyz;
	
	fTexCoord = vTexCoord; // Passa a coordenada adiante
	
	gl_Position = mProj * mView * vec4(fPos, 1.0);
}

precision mediump float;

uniform vec3 pointLightPosition;
uniform vec4 meshColor;
uniform samplerCube lightShadowMap;
uniform vec2 shadowClipNearFar;
uniform float bias;

varying vec3 fPos;
varying vec3 fNorm;

void main()
{
    // --- 1. LUZ PRINCIPAL (COM SOMBRA) ---
    vec3 toLightNormal = normalize(pointLightPosition - fPos);

    float fromLightToFrag =
        (length(fPos - pointLightPosition) - shadowClipNearFar.x)
        /
        (shadowClipNearFar.y - shadowClipNearFar.x);

    float shadowMapValue = textureCube(lightShadowMap, -toLightNormal).r;

    float light1Intensity = 0.0; 
    if ((shadowMapValue + bias) >= fromLightToFrag) {
        light1Intensity += 0.6 * max(dot(fNorm, toLightNormal), 0.0);
    }

    // --- 2. LUZ SECUNDÁRIA (PREENCHIMENTO) ---
    // Mantive isso para cumprir o requisito de "Múltiplas Fontes de Luz"
    vec3 light2Dir = normalize(vec3(-1.0, 1.0, 1.0)); 
    float light2Intensity = 0.3 * max(dot(fNorm, light2Dir), 0.0);

    // --- 3. LUZ AMBIENTE ---
    float ambientLight = 0.2;

    float totalLight = ambientLight + light1Intensity + light2Intensity;

    // --- 4. COR FINAL ---
    // Usamos apenas a cor do objeto (meshColor), sem texturas
    gl_FragColor = vec4(meshColor.rgb * totalLight, meshColor.a);
}
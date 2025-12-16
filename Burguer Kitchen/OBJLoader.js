'use strict';


function LoadOBJ(url, callback) {
    LoadTextResource(url, function(err, objText) {
        if (err) {
            callback(err);
            return;satisfies
        }
        
        try {
            var objData = ParseOBJ(objText);
            callback(null, objData);
        } catch (e) {
            callback(e);
        }
    });
}

function ParseOBJ(objText) {
    var vertices = [];
    var normals = [];
    var textures = [];
    
    var vertexIndices = [];
    var normalIndices = [];
    var textureIndices = [];
    
    var lines = objText.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        
        // Ignorar linhas vazias e comentários
        if (line === '' || line.charAt(0) === '#') {
            continue;
        }
        
        var parts = line.split(/\s+/);
        var command = parts[0];
        
        switch (command) {
            // Vértices
            case 'v':
                vertices.push(parseFloat(parts[1]));
                vertices.push(parseFloat(parts[2]));
                vertices.push(parseFloat(parts[3]));
                break;
            
            // Normais
            case 'vn':
                normals.push(parseFloat(parts[1]));
                normals.push(parseFloat(parts[2]));
                normals.push(parseFloat(parts[3]));
                break;
            
            // Coordenadas de textura
            case 'vt':
                textures.push(parseFloat(parts[1]));
                textures.push(parseFloat(parts[2]));
                break;
            
            // Faces
            case 'f':
                // Suporta faces triangulares e quadrangulares
                var face = [];
                for (var j = 1; j < parts.length; j++) {
                    var indices = parts[j].split('/');
                    face.push({
                        v: parseInt(indices[0]) - 1,  // OBJ usa índices começando em 1
                        vt: indices[1] ? parseInt(indices[1]) - 1 : -1,
                        vn: indices[2] ? parseInt(indices[2]) - 1 : -1
                    });
                }
                
                // Converter quadriláteros em triângulos
                for (var j = 0; j < face.length - 2; j++) {
                    vertexIndices.push(face[0].v, face[j + 1].v, face[j + 2].v);
                    if (face[0].vn >= 0) {
                        normalIndices.push(face[0].vn, face[j + 1].vn, face[j + 2].vn);
                    }
                    if (face[0].vt >= 0) {
                        textureIndices.push(face[0].vt, face[j + 1].vt, face[j + 2].vt);
                    }
                }
                break;
        }
    }
    
    // Se não houver normais, calcular normais por face
    var finalNormals = [];
    if (normalIndices.length === 0) {
        finalNormals = CalculateNormals(vertices, vertexIndices);
    } else {
        // Usar as normais do arquivo
        finalNormals = new Array(vertices.length);
        for (var i = 0; i < finalNormals.length; i++) {
            finalNormals[i] = 0;
        }
        
        for (var i = 0; i < normalIndices.length; i++) {
            var normalIndex = normalIndices[i];
            var vertexIndex = vertexIndices[i];
            if (normalIndex >= 0 && vertexIndex >= 0) {
                finalNormals[vertexIndex * 3] = normals[normalIndex * 3];
                finalNormals[vertexIndex * 3 + 1] = normals[normalIndex * 3 + 1];
                finalNormals[vertexIndex * 3 + 2] = normals[normalIndex * 3 + 2];
            }
        }
    }
    
    return {
        vertices: vertices,
        indices: vertexIndices,
        normals: finalNormals,
        textures: textures
    };
}

function CalculateNormals(vertices, indices) {
    var normals = new Array(vertices.length).fill(0);
    
    // Calcular normal para cada face
    for (var i = 0; i < indices.length; i += 3) {
        var i0 = indices[i] * 3;
        var i1 = indices[i + 1] * 3;
        var i2 = indices[i + 2] * 3;
        
        // Vértices da face
        var v0 = vec3.fromValues(vertices[i0], vertices[i0 + 1], vertices[i0 + 2]);
        var v1 = vec3.fromValues(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
        var v2 = vec3.fromValues(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
        
        // Arestas
        var edge1 = vec3.create();
        var edge2 = vec3.create();
        vec3.subtract(edge1, v1, v0);
        vec3.subtract(edge2, v2, v0);
        
        // Normal
        var normal = vec3.create();
        vec3.cross(normal, edge1, edge2);
        vec3.normalize(normal, normal);
        
        // Adicionar normal aos vértices da face
        normals[i0] += normal[0];
        normals[i0 + 1] += normal[1];
        normals[i0 + 2] += normal[2];
        
        normals[i1] += normal[0];
        normals[i1 + 1] += normal[1];
        normals[i1 + 2] += normal[2];
        
        normals[i2] += normal[0];
        normals[i2 + 1] += normal[1];
        normals[i2 + 2] += normal[2];
    }
    
    // Normalizar os vetores normais
    for (var i = 0; i < normals.length; i += 3) {
        var n = vec3.fromValues(normals[i], normals[i + 1], normals[i + 2]);
        vec3.normalize(n, n);
        normals[i] = n[0];
        normals[i + 1] = n[1];
        normals[i + 2] = n[2];
    }
    
    return normals;
}

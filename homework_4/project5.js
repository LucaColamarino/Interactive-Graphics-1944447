
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{

	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotXMatrix = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	var rotYMatrix = [
		Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
		0, 1, 0, 0,
		Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];

    var mv = trans;


    mv = MatrixMult(rotYMatrix, rotXMatrix);
    mv = MatrixMult(trans, mv);              

	return mv;
}


class MeshDrawer
{

constructor()
	{
		const vsSource = `
			attribute vec3 pos;
			attribute vec2 texCoord;
			attribute vec3 normal; // Vertex normal

			uniform mat4 mvp;          
			uniform mat4 mv;          
			uniform mat3 normalMatrix; 
			uniform bool swapYZ;

			varying vec2 vTexCoord;
			varying vec3 vNormalView;    
			varying vec3 vPosView;       

			void main() {
				vec3 position = pos;
                vec3 transformedNormal = normal;
				if (swapYZ) {
					position = vec3(pos.x, pos.z, pos.y);
                    transformedNormal = vec3(normal.x, normal.z, normal.y);
				}
				
				gl_Position = mvp * vec4(position, 1.0);
				vPosView = (mv * vec4(position, 1.0)).xyz;
				vNormalView = normalize(normalMatrix * transformedNormal);
				vTexCoord = texCoord;
			}
		`;

		const fsSource = `
			precision mediump float;

			varying vec2 vTexCoord;
			varying vec3 vNormalView;  
			varying vec3 vPosView;    

			uniform bool showTex;
			uniform sampler2D textureSampler;
			uniform vec3 lightDirView;
			uniform float shininess;

            uniform vec3 ambientMaterialColor;  
            uniform vec3 diffuseMaterialColor;  
            uniform vec3 specularMaterialColor; 

			void main() {
				vec3 N = normalize(vNormalView);
				vec3 L = normalize(lightDirView); 
				vec3 V = normalize(-vPosView);   
				vec3 H = normalize(L + V);     

				vec3 ambient = ambientMaterialColor; 

				float NdotL = max(dot(N, L), 0.0);
                vec3 actualDiffuseKd;
                if (showTex) {
                    actualDiffuseKd = texture2D(textureSampler, vTexCoord).rgb; // Kd from texture
                } else {
                    actualDiffuseKd = diffuseMaterialColor; // Kd is white (1,1,1)
                }
				vec3 diffuse = actualDiffuseKd * NdotL;

				vec3 actualSpecularKs = specularMaterialColor; // Ks is white (1,1,1)
				float NdotH = max(dot(N, H), 0.0);
                float specIntensity = 0.0;
                if (NdotL > 0.0) { // Only show specular if light hits the surface
				    specIntensity = pow(NdotH, shininess);
                }
				vec3 specular = actualSpecularKs * specIntensity;

				vec3 finalColor = ambient + diffuse + specular;
                
                float finalAlpha = 1.0;
                if (showTex) {
                    finalAlpha = texture2D(textureSampler, vTexCoord).a;
                }
				gl_FragColor = vec4(finalColor, finalAlpha);
			}
		`;

		this.prog = InitShaderProgram(vsSource, fsSource);
		
		this.posLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');

		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.mvLoc = gl.getUniformLocation(this.prog, 'mv');
		this.normalMatrixLoc = gl.getUniformLocation(this.prog, 'normalMatrix');
		this.swapYZLoc = gl.getUniformLocation(this.prog, 'swapYZ');
		
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');
		this.textureSamplerLoc = gl.getUniformLocation(this.prog, 'textureSampler');
		this.lightDirLoc = gl.getUniformLocation(this.prog, 'lightDirView');
		this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');

        this.ambientMaterialColorLoc = gl.getUniformLocation(this.prog, 'ambientMaterialColor');
        this.diffuseMaterialColorLoc = gl.getUniformLocation(this.prog, 'diffuseMaterialColor');
        this.specularMaterialColorLoc = gl.getUniformLocation(this.prog, 'specularMaterialColor');

		this.vertBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer();

		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

		this.numTriangles = 0;
		this.useTexture = true; 
		this.swap = false;

        gl.useProgram(this.prog); 
        gl.uniform3f(this.ambientMaterialColorLoc, 0.1, 0.1, 0.1); 
        gl.uniform3f(this.diffuseMaterialColorLoc, 1.0, 1.0, 1.0);  
        gl.uniform3f(this.specularMaterialColorLoc, 1.0, 1.0, 1.0); 
	}
	









	
	setMesh( vertPos, texCoords, normals )
	{
		this.numTriangles = vertPos.length / 3;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}
	
	swapYZ( swap )
	{
		this.swap = swap;

	}
	
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		gl.useProgram(this.prog);

	
		gl.uniformMatrix4fv(this.mvpLoc, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvLoc, false, matrixMV);
		gl.uniformMatrix3fv(this.normalMatrixLoc, false, matrixNormal);

		gl.uniform1i(this.swapYZLoc, this.swap ? 1 : 0);
		gl.uniform1i(this.showTexLoc, this.useTexture ? 1 : 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.enableVertexAttribArray(this.posLoc);
		gl.vertexAttribPointer(this.posLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.textureSamplerLoc, 0); 

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );

	}
	
	setTexture( img )
	{
		this.useTexture = true; 
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap(gl.TEXTURE_2D); 
        gl.bindTexture(gl.TEXTURE_2D, null); 
	}
	
	showTexture( show )
	{
		this.useTexture = show;
	}
	
	setLightDir( x, y, z )
	{
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLoc, x, y, z);
	}
	
	setShininess( shininess )
	{
		gl.useProgram(this.prog); 
		gl.uniform1f(this.shininessLoc, shininess);
	}
}

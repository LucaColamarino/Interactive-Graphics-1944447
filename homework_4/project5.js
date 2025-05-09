
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

			uniform mat4 mvp;          // Model-View-Projection matrix
			uniform mat4 mv;           // Model-View matrix (for transforming pos/normal to view space)
			uniform mat3 normalMatrix; // Inverse-transpose of mv's upper 3x3 (for transforming normals)
			uniform bool swapYZ;

			varying vec2 vTexCoord;
			varying vec3 vNormal;      // Normal in view space
			varying vec3 vViewPos;     // Vertex position in view space

			void main() {
				vec3 position = pos;
				if (swapYZ) {
					position = vec3(pos.x, pos.z, pos.y);
				}
				
				gl_Position = mvp * vec4(position, 1.0);
				
				// Transform position and normal to view space for lighting calculations
                // Use original 'pos' for lighting calculations, not the swapped 'position'
                // unless normals are also meant to be swapped.
                // Assuming swapYZ is for display coordinate system change, lighting should use consistent model coordinates.
                // Let's assume normal is also swapped if pos is swapped, for consistency or ensure normalMatrix handles it.
                // A safer bet is to transform the *original* normal and position for lighting.

                vec3 actualPos = pos; // Use original non-swapped pos for view space calculations
                vec3 actualNormal = normal;
                if (swapYZ) { // If YZ is swapped for position, it should be for normal too
                    actualNormal = vec3(normal.x, normal.z, normal.y);
                }


				vViewPos = (mv * vec4(actualPos, 1.0)).xyz;
				vNormal = normalize(normalMatrix * actualNormal);
				vTexCoord = texCoord;
			}
		`;

		const fsSource = `
			precision mediump float;

			varying vec2 vTexCoord;
			varying vec3 vNormal;      // Normal in view space
			varying vec3 vViewPos;     // Vertex position in view space

			uniform bool showTex;
			uniform sampler2D textureSampler;
			uniform vec3 lightDir;     // Light direction in view space
			uniform float shininess;

            // Material and light properties (can be made uniforms for more flexibility)
            uniform vec3 ambientColor;
            uniform vec3 diffuseColor;
            uniform vec3 specularColor;


			void main() {
				vec3 N = normalize(vNormal);
				vec3 L = normalize(lightDir); // Light direction is already in view space
				vec3 V = normalize(-vViewPos); // View vector (from fragment to eye)
				vec3 H = normalize(L + V);     // Halfway vector

				// Ambient
				vec3 ambient = ambientColor; // Base ambient material color

				// Diffuse
				float diff = max(dot(N, L), 0.0);
				vec3 diffuse = diffuseColor * diff;

				// Specular (Blinn-Phong)
				float spec = 0.0;
				if (diff > 0.0) { // only calculate specular if light hits the surface
					spec = pow(max(dot(N, H), 0.0), shininess);
				}
				vec3 specular = specularColor * spec;

        vec4 texColor;
        if (showTex) {
            texColor = texture2D(textureSampler, vTexCoord);
        } else {

            texColor = vec4(0.8, 0.8, 0.8, 1.0); 
        }

				vec3 finalColor = (ambient + diffuse) * texColor.rgb + specular;

				 if (!showTex) {
				 	gl_FragColor =  vec4(0.8, 0.8, 0.8, 1.0);
                 } else {
				    gl_FragColor = vec4(finalColor, texColor.a);
                 }
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
		this.lightDirLoc = gl.getUniformLocation(this.prog, 'lightDir');
		this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');

        this.ambientColorLoc = gl.getUniformLocation(this.prog, 'ambientColor');
        this.diffuseColorLoc = gl.getUniformLocation(this.prog, 'diffuseColor');
        this.specularColorLoc = gl.getUniformLocation(this.prog, 'specularColor');

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
        gl.uniform3f(this.ambientColorLoc, 0.2, 0.2, 0.2);
        gl.uniform3f(this.diffuseColorLoc, 0.7, 0.7, 0.7);
        gl.uniform3f(this.specularColorLoc, 1.0, 1.0, 1.0);
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

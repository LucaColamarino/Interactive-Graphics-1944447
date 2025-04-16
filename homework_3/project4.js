// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{ 
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotx = [
		1,0,0,0,
		0, Math.cos(rotationX), Math.sin(rotationX),0,
		0,-Math.sin(rotationX),Math.cos(rotationX),0,
		0,0,0,1
	];
	var roty = [
		Math.cos(rotationY), 0,-Math.sin(rotationY),0,
		0,1,0,0,
		Math.sin(rotationY),0, Math.cos(rotationY),0,
		0,0,0,1

	];
	var transrot = MatrixMult(trans,rotx);
	transrot = MatrixMult(transrot,roty);
	var mvp = MatrixMult( projectionMatrix, transrot );
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.
class MeshDrawer {
	constructor() {
		const vsSource = `
			attribute vec3 pos;
			attribute vec2 texCoord;
			uniform mat4 mvp;
			uniform bool swapYZ;
			varying vec2 vTexCoord;
			void main() {
				vec3 position = pos;
				if (swapYZ)
					position = vec3(pos.x, pos.z, pos.y);
				vTexCoord = texCoord;
				gl_Position = mvp * vec4(position, 1.0);
			}
		`;

		const fsSource = `
			precision mediump float;
			varying vec2 vTexCoord;
			uniform bool showTex;
			uniform sampler2D texture;
			void main() {
				if (showTex)
					gl_FragColor = texture2D(texture, vTexCoord);
				else
					gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);

			}
		`;

		this.prog = InitShaderProgram(vsSource, fsSource);
		gl.useProgram(this.prog);


		this.posLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');


		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.swapYZLoc = gl.getUniformLocation(this.prog, 'swapYZ');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');


		this.vertBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();


		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.numTriangles = 0;
		this.useTexture = false;
		this.swap = false;
		
	}

	setMesh(vertPos, texCoords) {
		this.numTriangles = vertPos.length / 3;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}

	swapYZ(swap) {
		this.swap = swap;
	}

	draw(trans) {
		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
		gl.uniform1i(this.swapYZLoc, this.swap);
		console.log("useTexture:", this.useTexture);
		gl.uniform1i(this.showTexLoc, this.useTexture ? 1 : 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.enableVertexAttribArray(this.posLoc);
		gl.vertexAttribPointer(this.posLoc, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	setTexture(img) {
		this.useTexture = true;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	showTexture(show) {
		this.useTexture = show;
	}
}

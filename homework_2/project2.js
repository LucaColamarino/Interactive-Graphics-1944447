// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{	
	let cos = Math.cos(rotation* (Math.PI / 180));
	let sin = Math.sin(rotation * (Math.PI / 180));
	let scaleMatrix = Array( scale, 0, 0, 0, scale, 0, 0, 0, 1 );
	let rotationMatrix = Array(cos,sin,0,-sin,cos,0,0,0,1);
	let translationMatrix = Array(1,0,0,0,1,0,positionX,positionY,1);
	out =  MultiplyMatrices(translationMatrix,rotationMatrix);
	out = MultiplyMatrices(out,scaleMatrix);
	return out;
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
	return MultiplyMatrices(trans2,trans1);
}

function MultiplyMatrices(a,b)
{
	let out = Array(0,0,0,0,0,0,0,0,0);
	for(let row =0; row<3;row++)
		{
			for(let column=0;column<3;column++)
				{
					out[row+column*3]= a[row]*b[column*3] + a[row+3]*b[column*3 +1] + a[row+6]*b[column*3 +2]    ;
				}
		}

	return out;
}

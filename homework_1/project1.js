// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    let bgData = bgImg.data;
    let fgData = fgImg.data;

    for(let y=0; y<fgImg.height;y++)
        {
            for(let x=0;x<fgImg.width;x++)
                {   fgx= x+fgPos.x;
                    fgy = y+fgPos.y;
                    if(fgx<0 || fgy<0 || fgx>=bgImg.width || fgy>=bgImg.height)
                        continue;
                    let bgindx = ((y+fgPos.y)*bgImg.width + x+fgPos.x)*4;
                    let fgindx = (y*fgImg.width+x) *4;
                    fgR= fgData[fgindx];
                    fgG= fgData[fgindx+1];
                    fgB= fgData[fgindx+2];
                    fgA= (fgData[fgindx + 3] * fgOpac) / 255;

                    bgR= bgData[bgindx];
                    bgG= bgData[bgindx+1];
                    bgB= bgData[bgindx+2];
                    bgA= bgData[bgindx+3];

                    bgData[bgindx]= fgR*fgA+(1-fgA)*bgR;
                    bgData[bgindx+1]=fgG*fgA+(1-fgA)*bgG;
                    bgData[bgindx+2]= fgB*fgA+(1-fgA)*bgB;
                }
        }


}

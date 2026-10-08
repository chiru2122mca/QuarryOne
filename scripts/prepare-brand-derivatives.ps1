# Crop/mask the approved master only: no synthesis, recoloring or redrawing.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$drawingReferences = @('System.Drawing.Common', 'System.Drawing.Primitives')
$drawingReferences += Get-ChildItem -LiteralPath $PSHOME -Filter 'System.Private.Windows.*.dll' | Select-Object -ExpandProperty FullName
Add-Type -ReferencedAssemblies $drawingReferences -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class QuarryBrandDerivatives {
    static bool Background(byte[] pixels, int index) {
        int p=index*4;
        int min=Math.Min(pixels[p],Math.Min(pixels[p+1],pixels[p+2]));
        int max=Math.Max(pixels[p],Math.Max(pixels[p+1],pixels[p+2]));
        return min>=238 && max-min<=20;
    }
    public static void Prepare(string sourcePath, string outputDirectory) {
        using (var source=new Bitmap(sourcePath)) {
            if(source.Width!=1254 || source.Height!=1254)
                throw new Exception("Master dimensions changed; review crop and mask before regenerating.");
            int w=source.Width,h=source.Height,count=w*h;
            using(var image=new Bitmap(w,h,PixelFormat.Format32bppArgb)) {
                using(var g=Graphics.FromImage(image)) g.DrawImageUnscaled(source,0,0);
                var data=image.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
                var pixels=new byte[count*4];
                Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
                var removed=new bool[count]; var queue=new int[count]; int head=0,tail=0;
                Action<int> seed=i=>{if(!removed[i] && Background(pixels,i)){removed[i]=true;queue[tail++]=i;}};
                for(int x=0;x<w;x++){seed(x);seed((h-1)*w+x);}
                for(int y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
                // Wordmark has no white ink: remove matte inside its enclosed letter counters too.
                // Interior whites/highlights in the quarry illustration remain protected.
                for(int y=940;y<h;y++) for(int x=0;x<w;x++) seed(y*w+x);
                while(head<tail){
                    int i=queue[head++],x=i%w,y=i/w;
                    if(x>0)seed(i-1);if(x<w-1)seed(i+1);
                    if(y>0)seed(i-w);if(y<h-1)seed(i+w);
                }
                for(int i=0;i<count;i++)if(removed[i])pixels[i*4+3]=0;
                Marshal.Copy(pixels,0,data.Scan0,pixels.Length);image.UnlockBits(data);
                SaveCrop(image,new Rectangle(65,108,1124,1070),outputDirectory+"/quarryone-full-transparent.png");
                SaveCrop(image,new Rectangle(205,110,805,818),outputDirectory+"/quarryone-emblem-transparent.png");
                SaveCrop(image,new Rectangle(65,940,1124,238),outputDirectory+"/quarryone-wordmark-transparent.png");
            }
        }
    }
    static void SaveCrop(Bitmap source,Rectangle rectangle,string path){
        using(var crop=source.Clone(rectangle,PixelFormat.Format32bppArgb))crop.Save(path,ImageFormat.Png);
    }
}
'@
$projectRoot = Split-Path -Parent $PSScriptRoot
[QuarryBrandDerivatives]::Prepare(
    (Join-Path $projectRoot 'assets/branding/quarryone-logo.png'),
    (Join-Path $projectRoot 'assets/branding')
)

from PIL import Image

im = Image.open("test_fig_251_truecolor_0.png")
print("test_fig_251_truecolor_0.png format:", im.format, "size:", im.size, "mode:", im.mode)
# Sample pixel colors (e.g. background and feather)
# Background should be near black (e.g. RGB < 30,30,30)
pixels = list(im.getdata())
print("Corner pixel [0]:", pixels[0])
print("Middle-ish pixel:", pixels[len(pixels)//2])
print("Sample 10 pixels:", pixels[100:110])


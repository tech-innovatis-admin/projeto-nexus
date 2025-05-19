from PIL import Image
import os

# Abrir a imagem PNG
input_path = "C:\Users\Desktop 0812\Downloads\Logo Innovatis Vetorizada.png"
image = Image.open(input_path)

# Converter para SVG usando traçado de contorno com Potrace (via imagem PBM)
# Primeiro converter para PBM (monocromático)
pbm_path = "C:\Users\Desktop 0812\Downloads\Logo Innovatis Vetorizada.pbm"
image.convert("1").save(pbm_path)

# Verificando se potrace está disponível para conversão
svg_path = "C:\Users\Desktop 0812\Downloads\Logo Innovatis Vetorizada.svg"

# Verificar se conseguimos usar uma alternativa com tracing (potrace não está disponível nativamente no ambiente)
svg_path



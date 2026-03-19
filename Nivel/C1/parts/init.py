# parts/__init__.py

from . import reading1, reading2, reading3, reading4, reading5, reading6, reading7, reading8
from . import listening1, listening2, listening3, listening4
from . import writing1, writing2
from . import speaking1, speaking2, speaking3, speaking4

# Diccionario para mapear cada parte con su módulo correspondiente
# Esto facilitará la automatización en el bucle principal
ALL_PARTS = {
    "reading": [reading1, reading2, reading3, reading4, reading5, reading6, reading7, reading8],
    "listening": [listening1, listening2, listening3, listening4],
    "writing": [writing1, writing2],
    "speaking": [speaking1, speaking2, speaking3, speaking4]
}
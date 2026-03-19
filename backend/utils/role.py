# Enum for user types: player, designer, viewer (spec: three user types).
# Keeps role values in one place.
from enum import Enum

class Role(Enum):
    # Role strings used in headers.
    PLAYER = "player"
    DESIGNER = "designer"
    VIEWER = "viewer"

    # Extend with more roles as needed.
    

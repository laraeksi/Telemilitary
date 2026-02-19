# Permission helpers based on Session role.
# Simple helpers used by legacy code.
from session import Session
from role import Role

class Permissions:

    @staticmethod
    # True if role is player.
    def is_player():
        # True when current session is a player.
        return Session.get_role() == Role.PLAYER
    
    @staticmethod
    # True if role is designer.
    def is_designer():
        # True when current session is a designer.
        return Session.get_role() == Role.DESIGNER
    
    
    @staticmethod
    # Print a simple denial message.
    def deny_access():
        # Simple console warning for legacy use.
        print("These actions are not permitted to be performed by the selected role.")


        

    

     

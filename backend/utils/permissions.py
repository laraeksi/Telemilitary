from session import Session
from role import Role

class Permissions:

    @staticmethod
    def is_player():
        return Session.get_role() == Role.PLAYER
    
    @staticmethod
    def is_designer():
        return Session.get_role() == Role.DESIGNER
    
    @staticmethod
    def is_maintainer():
        return Session.get_role() == Role.MAINTAINER
    
    @staticmethod
    def deny_access():
        print("These actions are not permitted to be performed by the selected role.")


        

    
     
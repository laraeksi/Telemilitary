import uuid
from role import Role

class Session:
    userId = None
    role = None
    
    @classmethod
    def generate_userId(sesh):
        sesh.userId = "u_" + str(uuid.uuid4())
  
    @classmethod
    def get_userId(sesh):
        return sesh.userId
    
    @classmethod
    def get_role(sesh):
        return sesh.role
    
    @classmethod
    def set_role(sesh, role):
        sesh.role = role

    
    

    

 
    



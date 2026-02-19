# Minimal session state for role/user id.
# Tiny in-memory session holder.
import uuid
from role import Role

class Session:
    userId = None
    role = None
    
    @classmethod
    # Create a new session user id.
    def generate_userId(sesh):
        # New random user id for this session.
        sesh.userId = "u_" + str(uuid.uuid4())
  
    @classmethod
    # Return current user id.
    def get_userId(sesh):
        # Read current user id.
        return sesh.userId
    
    @classmethod
    # Return current role.
    def get_role(sesh):
        # Read current role.
        return sesh.role
    
    @classmethod
    # Update the session role.
    def set_role(sesh, role):
        sesh.role = role

    
    

    

 
    



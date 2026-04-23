from typing import Dict

from vortexrag.server import VortexRAG_MCP_Server

app = VortexRAG_MCP_Server("sayhello")


@app.tool(output="name->msg")
def greet(name: str) -> Dict[str, str]:
    """Greet a person by name.
    
    Args:
        name: Name of the person to greet
    
    Returns:
        Dictionary with 'msg' containing the greeting message
    """
    ret = f"Hello, {name}!"
    app.logger.info(ret)
    return {"msg": ret}


if __name__ == "__main__":
    # Start the sayhello server using stdio transport
    app.run(transport="stdio")

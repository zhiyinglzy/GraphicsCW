class InputManager {
    
    constructor() {
        this.keys = []
        this.oldKeys = []
    }

    update()
    {
        /* of course, I could make another array,
           holding the indexes, iterating trough them...
           but I don't know what's a better solution. */
        this.oldKeys = this.keys.clone();
    }

    keyDown(code)
    {
        this.keys[ code ] = true;
    }

    keyUp(code)
    {
        this.keys[ code ] = false;
    }

    isKeyDown(code)
    {
        return ( this.keys[ code ] === true );
    }

    isKeyPressed(code)
    {
        return ( this.keys[ code ] === true && this.oldKeys[ code ] !== true );
    }
};

export default InputManager
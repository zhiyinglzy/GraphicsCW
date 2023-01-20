/*
 * Add pointerlock to teh geams!
 * Args: object
 *      sensitivity: Custom sensitivity of the mouse.
 */
var PointerLock = function( args )
{
    const g = window.g
    console.log(g)
    var scope = this;
    if ( !args ) args = {};
    this.sensitivity = args.sensitivity || 0.002;

    pointerLockActive = false;

    const onMouseMove = function( event )
    {
        if ( pointerLockActive === false ) return;

        const movementX = event.movementX || event.mozMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || 0;

        window.player.theta -= movementX * scope.sensitivity;
        window.player.phi -= movementY * scope.sensitivity;

        window.player.phi = Math.constrainRadius( window.player.phi, Math.TAU / 4 );
    }

    document.addEventListener( "mousemove", onMouseMove, false );
};

var hasBrowserPointerlock = function()
{
    return  'pointerLockElement' in document
            || 'mozPointerLockElement' in document
            || 'webkitPointerLockElement' in document;
}

var requestPointerLock = function()
{
    var element = document.body;

    if ( hasBrowserPointerlock() )
    {
    	var pointerlockchange = function( event )
        {
    		if (document.pointerLockElement === element ||
    			document.mozPointerLockElement === element ||
    			document.webkitPointerLockElement === element )
            {
                document.getElementById("menu").style.display = "none";
    			pointerLockActive = true;
    		}
    		else
            {
                document.getElementById("menu").style.display = "flex";
                pointerLockActive = false;
    		}
    	};

    	var pointerlockerror = function( event )
        {
            console.warn("Mysterious pointerlock error! :(");
            console.log( event );
            pointerLockActive = false;
    	};

    	document.addEventListener( 'pointerlockchange', pointerlockchange, false );
    	document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
    	document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

    	document.addEventListener( 'pointerlockerror', pointerlockerror, false );
    	document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
    	document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

    	var requestPointerLock = function( event )
        {
    		element.requestPointerLock = element.requestPointerLock
                || element.mozRequestPointerLock
                || element.webkitRequestPointerLock;

    		element.requestPointerLock();
    	};

    	element.addEventListener( 'click', requestPointerLock, false );
        return true;
    }
    else
    {
        console.log("Upgrade your browser! Please! I can't use pointerlock!"); //element.innerHTML = 'Bad browser; No pointer lock';
        return false;
    }
}

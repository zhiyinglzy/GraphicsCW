import * as THREE from 'three'


const TorchBuilder = function() {
    
    // TODO: Too much hard-coded. It depends on the wall sizes, too.
    var torchGeometry = new THREE.BoxGeometry( 0.07, 0.35, 0.07 );
    var torchMaterial = new THREE.MeshPhongMaterial({
        color: 0x964B00
    });

    window.geometries.push(torchGeometry);

    this.torchMesh = new THREE.Mesh( torchGeometry, torchMaterial );
    this.torchLight = new THREE.PointLight( 0xFF6600, 1, 3 );
    this.geometry = new THREE.Geometry();
    
    this.torches = [];
    
};


TorchBuilder.prototype.addTorch = function( pos, angle ) {
    const newTorch = new Torch( pos, angle, this )
    this.torches.push( newTorch );
    return newTorch
};
    
TorchBuilder.prototype.finish = function() {
        
    var geom = new THREE.BufferGeometry().fromGeometry( this.geometry );
    geom.computeBoundingSphere();
    
    var mesh = new THREE.Mesh( geom, this.torchMesh.material );
    
    scene.add( mesh );
    
};

// A torch!
var Torch = function( pos, angle, torchBuilder ) {
    
    var torchPos = new THREE.Vector3( 0.45, 0.18, 0 );
    var lightPos = new THREE.Vector3( 0.37, 0.18 + 0.2, 0 );
    var rotationVec = new THREE.Vector3( 0, 0, 0.39 );

    torchPos.rotateToY( angle );
    lightPos.rotateToY( angle );
    rotationVec.rotateY( angle );

    torchPos.add( pos );
    lightPos.add( pos );

    var torch = torchBuilder.torchMesh.clone();
    torch.position.copy( torchPos );
    torch.rotation.setFromVector3( rotationVec );

    // to transform a matrix would be too complex, so I do this instead.
    torchBuilder.geometry.mergeMesh( torch );

    const lightCopy = torchBuilder.torchLight.clone();
    lightCopy.position.copy(lightPos)

    this.light = lightCopy
    scene.add( this.light );
    
    return lightCopy;
    //var pointLightHelper = new THREE.PointLightHelper( this.light, 0.01 );
    //scene.add( pointLightHelper );
};

/*Torch.prototype.update = function( delta )
{
    this.light.intensity = rnd( 90, 100 ) / 100.0;
};*/

export default TorchBuilder;
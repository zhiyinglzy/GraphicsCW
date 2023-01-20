// import * as THREE from "../node_modules/three/build/three.module.js"
import * as THREE from 'three'

Math.TAU = Math.PI * 2.0;

export const Direction =
{
    North: 1,
    East: 0,
    South: 3,
    West: 2
}

export const DirectionToAngle = function ( dir )
{
    return Math.TAU * dir / 4;
};

// Rotates this vector to theta.
THREE.Vector3.prototype.rotateToY = function( theta )
{
    var ox = this.x;
    this.x = ox * Math.cos( theta );
    this.z = ox * Math.sin( theta );
};

// Rotates this vector by theta.
THREE.Vector3.prototype.rotateY = function( theta )
{
    var s = Math.sin( theta );
    var c = Math.cos( theta );

    var ox = this.x, oz = this.z;
    this.x = ox * c - oz * s;
    this.z = oz * c + ox * s;
};

// Clamps rotation
export const rotclamp = function( r )
{
    while ( r >= Math.TAU )
    {
        r -= Math.TAU;
    }
    while ( r <= -Math.TAU )
    {
        r += Math.TAU;
    }
    return r;
}

export {}
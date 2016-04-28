var sharp = require( 'sharp' ),
	AWS = require( 'aws-sdk' ),
	path = require( 'path' )

var regions = {}

module.exports = function( region, bucket, key, args, callback ) {
	AWS.config.region = region
	if ( ! regions[ region ] ) {
		regions[ region ] = new AWS.S3({region: region})
	}
	var s3 = regions[ region ]

	var file = s3.makeUnauthenticatedRequest( 'getObject', { Bucket: bucket, Key: key }, function( err, data ) {

		if ( err ) {
			return callback( err )
		}

		try {
			var image = sharp( data.Body ).withMetadata(),
			    scale = 1

			// convert gifs to pngs
			if ( path.extname( key ).toLowerCase() === '.gif' ) {
				image.png()
			}

			// shorthand for retina scale low quality jpegs
			if ( undefined !== args.retina && path.extname( key ).toLowerCase().match(/jpe?g/) ) {
				scale = 2
				image.quality(40)
			}

			// allow override of compression quality
			if ( args.quality ) {
				image.quality( Math.min( Math.max( Number( args.quality ), 0 ), 100 ) )
			}

			// allow override of scale
			if ( args.scale ) {
				scale = Number( args.scale )
			}

			// resize & crop
			if ( args.resize ) {
				image.resize.apply( image, args.resize.split(',').map( function( v ) { return Number( v ) * scale } ) )
			} else if ( args.fit ) {
				image.resize.apply( image, args.fit.split(',').map( function( v ) { return Number( v ) * scale } ) )
				image.max()
			} else if ( args.w || args.h ) {
				image.resize( Number( args.w ) * scale, Number( args.h ) * scale )

				if ( ! args.crop ) {
					image.max()
				}
			}

			// send image
			image.toBuffer( function( err, _data, info ) {
				if ( err ) {
					return callback( err )
				}

				info.originalSize = data.ContentLength

				return callback( err, _data, info )
			} )
		} catch( err ) {
			return callback( err )
		}
	} )
}

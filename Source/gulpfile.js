//load plugins
var gulp             = require('gulp'),
	uglify           = require('gulp-uglify'),
	rename           = require('gulp-rename'),
	path             = require('path');


//scripts
gulp.task('scripts', function() {
	return gulp.src('js/main.js')
        .pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest('js'));
});

//watch
gulp.task('live', function() {

	//watch .js files
	gulp.watch('js/main.js', ['scripts']);

});
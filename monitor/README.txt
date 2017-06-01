To run this gulp task:
$ gulp monitor

The first time the task will print something like:
> Unable to open file 'data/yahoo.json'
> FILES ADDED
> 	https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js
> 	/js/jquery-3c9137d88a.js
> 	/js/jquery.easing.min-9cda9e740b.js
> 	/js/jquery.fullPage.min-1412add375.js
> 	/js/controller-21db8655f0.js
> 	https://s.yimg.com/ss/rapid-3.32.js
> 	/js/login-396bbc3a3b.js

On each execution the task will compare the .js in the html. If there is no 
change, it will print nothing. When a .js in the html is changed it will print 
something like:
> [23:39:03] ERROR
> FILES REMOVED
> 	https://ajax.googleapis.com/ajax/libs/webfont/1/wdebfont.js
> FILES ADDED
> 	https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js

In order to add a new site to be monitored a new file must be created in
'monitor/sites/' with a .json extension. The file must contain the following
values:

{
    "url": URL to monitor,
    "file": relative path to place the last .js files found,
    "exclude": An array with regular expressions to exclude,
    "debug": verbose mode?
}
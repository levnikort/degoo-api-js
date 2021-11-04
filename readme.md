# Degoo api

Degoo.js library provides methods for working with the site degoo.com

## List of available methods
- **auth(*email*, *password*)** - authorization by mail and password
- **profile()** - getting profile information
- **fileList(*pathId*)** - getting a list of files from a directory
- **uploadDir(*pathId*, *folderPath*, *removeNamespace*)** - upload directory
- **upload(*pathId*, *folderPath*, *filename*)** - upload a file or directory
- **createDir(*pathId*, *name*)** - create a directory
- **share(*fileId*)** - share a file
- **search(*string*, *limit*)** - search for files or directories

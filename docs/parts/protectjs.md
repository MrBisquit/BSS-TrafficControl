# Protect.JS
Protect.js is a core feature of BSS-TrafficControl and if you remove it, it will remove a core chunk of the features that BSS-TrafficControl provides such as link security, requesting assets and more.

<h1><b>Do not change or edit the Protect.JS file unless you are contrubiting* to it or fixing a bug.</b></h1>
*Contributing can mean fixing bugs, adding features or improving it. A normal user who is just using this security repo should not edit this file unless they know what they are doing.

`let w = window, d = document, c = console;` This is here to make it easier and quicker to type.

`checkExists(value);` Simple little function to check if a value exists, a lot of things depend on this so should not be removed.

`errorCodes` This is an object containing errors that may be sent by the server, these should not be edited unless you are adding in a new one.
These are
- `NO_ERROR`, ID: 0, This could mean that there is an unknown error or there is just no error.
- `INVALID_TOKEN`, ID: 1, The server was sent an invalid token.
- `UNAUTHORISED`, ID: 2, The server has said that the request/user was/is unauthorised.
- `RESPONSE_NOT_OK`, ID: 3, Either frontend can use this if the response that it fetched when checked said `ok` was false or recieved from the server because something went wrong with the response.
- `INVALID_UNRECOGNISED_OR_MISSING_ERROR`, ID: 4, You will probably rarely have to use this or see this because this is in the case that there was an error but it does not know what the error is (Or it does and it just doesen't have an ID/Message for it).

Protect.JS will periodically scan over the document and check for `a` tags, if they contain a `href` then this will replace that link with a function that checks the link before allowing them to proceed, most likely giving them a popup if there is something wrong or it is on in the `config.json` file.
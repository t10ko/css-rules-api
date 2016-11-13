# Library to manipulate with stylesheet rules using JavaScript.

This is a powerfull library which is about parsing and changing all CSS rules available in a webpage.

# API reference.

This library iterates CSS rules asyncronousely to prevent lagging.  
It also detects rule changes, stylesheet adds, deletes and [disables](https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet/disabled), media rule activations/deactivations.

### CSSRules.forEach( handlers, flags )

Use this function to iterate through all available rules right now.

**handlers** is an object which gives callstart(property *start*), callback(property *end*) and step(property *step*) handlers.  
If function given, it will be considered as a step handler.

Pass rule types with **flags** argument.  
If you want to iterate only throught some types of rules pass that types with flags.  
Available type flags`  
1. *CSSRules.STYLE_RULE*  
2. *CSSRules.MEDIA_RULE*  
3. *CSSRules.KEYFRAMES_RULE*  
4. *CSSRules.KEYFRAME_RULE*  
5. *CSSRules.IMPORT_RULE*

Also if you dont want to iterate throught inactive rules, pass *CSSRules.SKIP_INACTIVES* flag.

Usage`
```javascript
CSSRules.forEach( function ( rule, type, key_text ) {
    console.log( 'Found a rule', rule, '!!!' );
}, CSSRules.SKIP_INACTIVES );
```

As you can see, listeners gets 3 arguments.  
**rule** is the current rule object, **type** is the type of that rule and **key_text** is the selector string.  
In case of keyframe rule, **key_text** is the animation percentage selector of current keyframe.  
In case of keyframes rule, **key_text** is the name of that animation.  
In case of media rule, **key_text** is the media query string of that rule.

You can also control iteration flow.
```javascript
CSSRules.forEach( function ( rule, type, key_text ) {
    if( type == CSSRules.MEDIA_RULE ) {
    
        //  This will ignore all media rules.
        this.continue();
        return;
    }
    console.log( 'Found a rule', rule, '!!!' );
}, CSSRules.SKIP_INACTIVES );
```

```javascript
CSSRules.forEach( function ( rule, type, key_text ) {

    //  this.container() gives the stylesheet/rule object which is the parent of this rule.
    if( this.container().type == CSSRules.MEDIA_RULE ) {
    
        //  This will get out of the container of given rule.
        //  Lets say this rule is inside of stylesheets media rule, 
        //  and you dont want to iterate throught that media anymore.
        this.break();
        return;
    }
    console.log( 'Found a rule', rule, '!!!' );
} );
```

```javascript
var i = 0;
CSSRules.forEach( function ( rule, type, key_text ) {
    if( i++ > 10 ) {
    
        //  This will cancel whole iteration.
        this.cancel();
        return;
    }
    console.log( 'Found a rule', rule, '!!!' );
} );
```

More functions to get information about the current iteration.  
1. *this.active()* tells if the container of current rule is currently active. Container is active, if it's styles are applied.
2. *this.list()*  gives a list of CSS rules of current container.  
3. *this.index()*  gives an index of this rule in the list of rules.

### CSSRules.addListener( id, listener, types )

Adds stylesheet change listener.  
**id** is just an identificator for given listener.  
You can filter rules with **types**. Available types flags are mentioned above.

```javascript
CSSRules.addListener( 'test-id', function ( added, rule, type, key_text ) {
    if( added ) {
        console.log( 'Rule', rule, 'was added!' );
    } else {
        console.log( 'Rule', rule, 'was removed!' );
    }
} );
```

You can have multiple listeners with the same **id**.  
This handler will be called on every stylesheet add/delete, rule add/delete and media query change.

### CSSRules.removeListener( id )

Removes stylesheet change listeners with given **id**.
```javascript

//  This will stop listening to rule changes.
CSSRules.removeListener( 'test-id' );
```

## Changing available rules.

### CSSRules.change( changer, handlers, types )

Iterates throught all available active rules trying to change them.

**changer** is the callstep handler, which changes given rules if there is a need.  
**handlers** is an object which gives callstart(property *start*), callback(property *end*) and step(property *step*) handlers.

**types** is types of rules which you need to change. By default this will iterate only throught style rules. Available types are.  
1. CSSRules.KEYFRAME_RULE  
2. CSSRules.STYLE_RULE

```javascript

//  This parses selector and finds wanted pseudoclass.
var ParsePseudo = ( function ( matcher ) {
	return function ParsePseudo( selector, name ) {
		var result = false, match, pre_index = -1;
		matcher.lastIndex = 0;
		while( (pre_index = matcher.lastIndex, match = matcher.exec( selector )) ) {
			if( match[0].charAt( 0 ) == ':' && name == match[7] ) {
				result = [ pre_index, matcher.lastIndex ];
				break;
			}
		}
		return result;
	};
} ) ( /[\w\u00a1-\uFFFF][\w\u00a1-\uFFFF-]*|[#.](?:[\w\u00a1-\uFFFF-]|\\:|\\.)+|[ \t\r\n\f](?=[\w\u00a1-\uFFFF*#.[:])|[ \t\r\n\f]*(,|>|\+|~)[ \t\r\n\f]*|\[([\w\u00a1-\uFFFF-]+)[ \t\r\n\f]*(?:([!*=^=$=~=|=]?=)[ \t\r\n\f]*(?:"([^"]*)"|'([^']*)'|([^\]]*)))?]|:([-\w\u00a1-\uFFFF]+)(?:\((?:"([^"]*)"|'([^']*)'|([^)]*))\))?|\*|(.+)/g );

//  This just replaces a string in between of the source.
function ReplaceInBetween( source, start, end, to ) {
	return source.slice( 0, start ) + to + source.slice( end );
};
CSSRules.change( function ( rule, type, key_text ) {

	//	rule is not a native rule object, to get it, write
	var native_rule = rule.$, 

		//	Selectors is the splitted array of selectors that are comma separated.
		list = rule.selectors, 
		changed = false, 
		i = 0;

	//	You can iterate throught all selectors, check if you need to change something.
	for( ; i < list.length; i++ ) {
		var selector = list[ i ], 
			parsed = ParsePseudo( selector, 'hover' );
		if( parsed ) {

			//	rule.styles contains the CSSStyleDeclaration object of that rule.
			rule.styles.display = 'inline-block';

			//	Replacing hover pseudoclass with a hover class, so you can hover all elements at any time.
			list[ i ] = ( changed = true, ReplaceInBetween( selector, parsed[0], parsed[1], '.hover-class' ) );
		}
	}
	if( changed ) {
		var new_selector = list.join( ', ' );

		//	rule.setSelector changes it's selector.
		rule.setSelector( new_selector );
		console.log( 'Changed rule ', rule.$.selectorText, 'to', new_selector );
	}
}, {
    start: function () {
        console.log( 'Changing rules iteration has started!' );
    }, 
    end: function () {
        console.log( 'Changing rules iteration has been ended' );
    }
} );
```

You can add rules too.
```javascript

var is_first = true;
CSSRules.change( function ( rule, type, key_text ) {
	var new_selector = rule.selectors.join( ',' );
	if( is_first ) {

		//	This will add a new rule immediately after this one.
		//	First argument is the new rule's selector, second is style's css text.
		this.addAfterThis( '#this-will-get-lots-of-styles', '{ display: \'inline-block\'; }' );
		is_first = false;
	} else {
		
		//	As you can see, 2nd argument is optional, 
		//	in this case it will take the style of the current rule.
		this.addAfterThis( '#this-will-get-lots-of-styles' );
	}
}, {
    start: function () {
        console.log( 'Changing rules iteration has started!' );
    }, 
    end: function () {
        console.log( 'Changing rules iteration has been ended' );
    }
} );
```

You can have only one rule changer at a time.

### CSSRules.undo( callback )

This will restore all applied changes, and cancelles current rule changer, so you can add a new one.  
This also works asyncronousely and callback will be called after all changes are undone.

## Browser support

|Chrome|Firefox|IE |Opera|Safari|
|:----:|:-----:|:-:|:---:|:----:|
|18    |14     |11 |15   |6.0   |
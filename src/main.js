( function ( scope, configs, factory ) {
	if( typeof exports === 'object' && typeof module === 'object' ) {
		module.exports = factory( configs );
	} else if( typeof define === 'function' && define.amd ) {
		define( [], function () { return factory( configs ); } );
	} else {
		( typeof exports === 'object' ? exports : scope ).CSSRules = factory( configs );
	}
} ) ( this, {
	foreachIterationsPerThread: 800, 
	loadCheckInterval: 100, 
	loopTimeout: 50, 
	testerClass: 'stylesheet-activity-switch-hook-', 
	sheetHookersAnimation: 'sheet-activity-checker-'
}, function ( APIConfig ) {
	if( !window.VendorPrefixes || 
		!window.Natives || 
		!Object.defineProperty || 
		!Object.getOwnPropertyNames || 
		!Object.getOwnPropertyDescriptor || 
		!Natives.translate( 'AnimationEvent', { prefixType: 'JSClass' } ) || 
		!Natives.translate( 'MutationObserver', { prefixType: 'JSClass' } ) 
	) {
		console.error( 'This browser cannot support CSSRules API.' );
		return;
	}

	var ArrayProto = Array.prototype, 
		ArrayPush = ArrayProto.push;
	var HasOwn = ( function () {
		var has_own = {}.hasOwnProperty;
		return function HasOwn( target, name ) {
			return !!name && has_own.call( target, name );
		};
	} ) ();
	var GetType, IsInstanceOf, GetConstructorName;
	( function () {
		var class2type = _(), 
			ToString = {}.toString;

		[ 'Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Object', 'Error', 'Symbol' ].forEach( function ( name ) {
			class2type[ '[object ' + name + ']' ] = name.toLowerCase();
		} );
		GetType = ( function () {
			return function GetType( obj ) {
				return obj == null ? obj + '' : (
					typeof obj === 'object' || typeof obj === 'function' ?
					class2type[ ToString.call( obj ) ] || 'object' :
					typeof obj
				);
			};
		} ) ();
		GetConstructorName = ( function () {
			return function GetConstructorName( obj, classname ) {
				return obj != null && ToString.call( obj ).slice( 8, -1 );
			};
		} ) ();
		IsInstanceOf = ( function () {
			return function IsInstanceOf( obj, classname ) {
				return GetConstructorName( obj ) == classname;
			};
		} ) ();
	} ) ();
	function IsObject( value ) { return value != null && ( typeof value === 'function' || typeof value === 'object' ); };
	function IsScalar( value ) { return !IsObject( value ); };
	var IsArray = Array.isArray;
	var IsFunction = ( function () {
		var func_proto = Function.prototype;
		return function IsFunction( target ) { return typeof target === 'function' && target != func_proto; };
	} ) ();
	function IsString( target ) { return target != null && ( GetType( target ) === 'string' ); };
	function IsWindow( target ) { return target != null && target === target.window; };
	function IsDocument( target ) { return target != null && IsInstanceOf( target, 'HTMLDocument' ); };
	var IsElement = ( function () {
		var self = IsElement;
		self.WINDOW = 1;
		self.DOCUMENT = 2;
		self.ELEMENT = 3;
		function IsElement( target, only_element ) {
			if( target ) {
				if( target instanceof Element )
					return self.ELEMENT;
				if( !only_element ) {
					if( IsWindow( target ) )
						return self.WINDOW;
					if( IsDocument( target ) )
						return self.DOCUMENT;
				}
			}
			return false;
		};
		return self;
	} ) ();
	function IsArrayLike( obj ) {
		if( !IsObject( obj ) || IsFunction( obj ) || IsWindow( obj ) )
			return false;
		var length = !!obj && ('length' in obj) && obj.length;
		return IsArray( obj ) || length === 0 || IsNumber( length ) && length > 0 && ( length - 1 ) in obj;
	};
	var CopyObject = ( function () {
		function CreateInstance( arg, is_array ) {
			if( is_array ) {
				var result = [];
				result[ arg.length-1 ] = undefined;
				return result;
			} else if( arg.constructor )
				try { return arg.constructor(); } catch( err ) {}
		};
		function CopyItem( copied, arg, name, depth ) {
			var value = arg[ name ];
			copied[ name ] = IsObject( value ) && depth ? CopyObject( value, depth ) : value;
		};
		return function CopyObject( arg, depth ) {
			if( arguments.length > 1 ) 
				depth = -1; 
			depth--;

			var is_array = IsArray( arg );
			if( arg == null || !IsObject( arg ) )
				return arg;

			var copied = CreateInstance( arg ) || Object.create( null );
			if( is_array ) {
				for( var i = 0; i < arg.length; i++ ) 
					CopyItem( copied, arg, i, depth );
			} else {
				for( var name in arg ) 
					CopyItem( copied, arg, name, depth );
			}
			return copied;
		};
	} ) ();
	function RandomString( len ) {
		len = len || 8;
		var id = '';
		while( (id += Math.random().toString(16).slice(2), id.length < len) );
		return id.slice(0, len);
	};
	function ObjectID( target, dont_make ) {
		var key = target.objectUniqueID;
		if( !key && !dont_make ) 
			Object.defineProperty( target, 'objectUniqueID', { value: key = RandomString() } )
		return key;
	};
	function InitProto( api ) {
		var proto = api.prototype;
		return (proto.constructor = api, proto);
	};
	function PopProp( target, prop ) {
		var result = target[ prop ];
		delete target[ prop ];
		return result;
	};
	function ShiftObject( target, only_value ) {
		for( var key in target ) {
			var value = PopProp( target, key );
			return only_value ? value : { key: key, value: value };
		}
	};
	function IsObjectEmpty ( arg ) {
		for( var i in arg ) return false;
		return true;
	};
	function HasToString( value ) { return IsScalar( value ) || ( 'toString' in value ); };
	function Slice( target, begin, end ) {
		var i, result = [], size, len = target.length;
		begin = ((begin = begin || 0) >= 0) ? begin : Math.max(0, len + begin);
		if((end = isNaN(end) ? len : Math.min(end, len)) < 0) end = len + end;
		if((size = end - begin) > 0) {
			result = new Array(size);
			for (i = 0; i < size; i++) result[i] = target[begin + i];
		}
		return result;
	};
	var CopyArray = Slice;
	function RemoveFrom( container, index ) {
		var result = container[ index ];
		container.splice( index, 1 );
		return result;
	};
	function IsNumber( value ) { return IsScalar( value ) && value+0 === value; };
	var Execute = ( function () {
		var self = Execute;

		//	This function is for overloading flags attribute.
		function Execute() {
			var args = Slice( arguments ), 
				i = 1;
			for( ; i < 3; i++ ) {
				var arg = args[i];
				if( IsNumber( arg ) ) {
					args[3] = arg;
					args[i] = null;
				}
			}
			return Run.apply( null, args );
		};
		function Run( handlers, args, that, flags ) {
			if( !args )
				args = [];
			else if( !IsArrayLike( args ) ) 
				args = [ args ];

			var break_on_false = self.BREAK_ON_FALSE & flags, 
					get_results = self.GET_RESULTS & flags, 
					results = get_results && {} || true, 
					is_array = IsArray( handlers );

			if( is_array ) 
				handlers = { '0': handlers };
			for( var id in handlers ) {
				if( get_results ) 
					results[ id ] = [];

				var list = handlers[ id ], i = 0;
				if( !IsArray( list ) ) 
					list = [ list ];

				for( ; i < list.length; i++ ) {
					var result = list[ i ].apply( that, args ), 
							do_break = break_on_false && result === false;
					if( get_results ) 
						results[ id ].push( result );
					if( do_break ) {
						if( !get_results )
							results = false;
						break;
					}
				}
			}
			if( get_results && is_array )
				results = results[0];
			return results;
		}
		self.BREAK_ON_FALSE = 1;
		self.GET_RESULTS = 2;
		return self;
	} ) ();
	function _() {
		var result = Object.create( null ), name, i = 0;
		for( ; i < arguments.length; i++ ) {
			var value = arguments[i];
			if( !(i % 2) ) {
				name = value;
			} else {
				result[ name ] = value;
			}
		}
		return result;
	};

	//	Fixing IE11 mutation observer bug.
	//	See at: https://gist.github.com/t10ko/4aceb8c71681fdb275e33efe5e576b14
	( function () {
		var example = document.createElement( '_' ),
		    observer = new MutationObserver( function () {} );
		observer.observe( example, { attributes: true } );

		//	Randomly changing style attribute using setProperty method.
		example.style.setProperty( 'display', 'block' );

		//	If no mutation record generated, than it's IE11 and it's a bug :)
		if( !observer.takeRecords().length ) {
			Natives.hook( 'CSSStyleDeclaration.prototype.setProperty', function ( original ) {
				return function ( name, to_value ) {
					var value = this.getPropertyValue( name ),
						priority = this.getPropertyPriority( name ),
						result = original.apply( this, arguments );

					//	HACK!
					//	If something modified after setProperty call, generate mutation by appending white space to cssText.
					if( value != this.getPropertyValue( name ) || priority != this.getPropertyPriority( name ) ) 
						this.cssText += ' ';
					return result;
				}
			} );
		}
	} ) ();

	var self = _(), 
		main = self, 

		type_to_flag = _(), 

		HTML = document.documentElement, 
		Body, 
		Head, 

		APIStyleNode, 
		namespace = 'css-rules-', 

		//	Those constants can be vendor prefixed, need to translate.
		KEYFRAMES_RULE, 
		KEYFRAME_RULE, 
		IMPORT_RULE, 
		MEDIA_RULE = CSSRule.MEDIA_RULE, 
		STYLE_RULE = CSSRule.STYLE_RULE;

	//	Preparing API configuration object.
	[ 'testerClass', 'sheetHookersAnimation' ].forEach( function ( name ) {
		APIConfig[ name ] = namespace + APIConfig[ name ];
	} );

	//	Translating and loading all APIs and constants that are needed here.
	( function ( flags ) {
		Natives.load( 'CSSStyleSheet', 'CSSMediaRule' );

		Natives.load( 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', { bindToParent: true } );
		Natives.translate( 'CSSKeyframeRule', { prefixType: 'JSClass' } );
		Natives.translate( 'CSSKeyframesRule', { prefixType: 'JSClass' } );
		Natives.translate( 'MutationObserver', { prefixType: 'JSClass' } );

		//	Translating rule
		KEYFRAMES_RULE = Natives.$.CSSKeyframesRule && Natives.translate( 'KEYFRAMES_RULE', flags );
		KEYFRAME_RULE = Natives.$.CSSKeyframeRule && Natives.translate( 'KEYFRAME_RULE', flags );
		IMPORT_RULE = Natives.translate( 'IMPORT_RULE', flags );
	} ) ( { from: 'CSSRule', prefixType: 'const' } );

	main.MEDIA_BREAKPOINT = 1;

	//	Mapping rule type constants to it's flags.
	type_to_flag[ KEYFRAMES_RULE ] = ( main.KEYFRAMES_RULE = 1 );
	type_to_flag[ KEYFRAME_RULE ] = ( main.KEYFRAME_RULE = 2 );
	type_to_flag[ MEDIA_RULE ] = ( main.MEDIA_RULE = 4 );
	type_to_flag[ STYLE_RULE ] = ( main.STYLE_RULE = 8 );
	type_to_flag[ IMPORT_RULE ] = ( main.IMPORT_RULE = 16 );

	//	Flags for foreach loop functionality.
	main.SKIP_INACTIVES = 32;

	/**
	 * Gives a rule list of given target.
	 * @param {Mixed}	target
	 * @param {Boolean}	or_given	Give true 
	 */
	function RulesOf( target, or_given ) {
		var rules = null;
		try { rules = target.cssRules || target; } catch( err ) {}
		if( !rules && or_given )
			rules = target;
		return rules;
	};

	/**
	 * Checks if given variable is a styleSheet object.
	 * @param	{Mixed}		value	Value to check.
	 * @return	{Boolean}
	 */
	main.isSheet = function IsSheet( value ) { return IsInstanceOf( value, 'CSSStyleSheet' ); };

	/**
	 * Checks if given variable is a rule object.
	 * @param	{Mixed}		value	Value to check.
	 * @return	{Boolean}
	 */
	main.isRule = ( function () {
		var regex = /CSS[a-z]+Rule/i;
		return function IsRule( value ) { return regex.test( GetConstructorName( value ) ); };
	} ) ();

	/**
	 * Checks if given styleSheet object is loaded.
	 * @param	{StyleSheet}	sheet	Sheet to check.
	 * @return	{Boolean}       		Returns true if it's loaded.
	 */
	main.isLoaded = function ( sheet ) {
		var rules;
		if( !sheet )
			return false;
		try { rules = sheet.cssRules; } catch( err ) { return false; }
		return !!rules;
	};

	/**
	 * This function splits multiple selectors(separated with comma).
	 * @param	{String}	selectors	Selectors to split.
	 */
	function SplitSelector( selectors ) {
		var splitted = [], 
			parens = 0, 
			angulars = 0, 
			so_far = '', 
			i = 0;
		for ( ; i < selectors.length; i++) {
			var char = selectors[i];
			if (char === '(') {
				parens++;
			} else if (char === ')') {
				parens--;
			} else if (char === '[') {
				angulars++;
			} else if (char === ']') {
				angulars--;
			} else if (char === ',' && !parens && !angulars) {
				splitted.push( so_far.trim() );
				so_far = '';
				continue;
			}
			so_far += char;
		}
		splitted.push( so_far.trim() );
		return splitted;
	};

	/**
	 * Get selectors of given rule.
	 * ownerRule is only for importRule, ownerNode is for styleSheet, parentRule and parentStyleSheet are for rule.
	 * @param	{Mixed}	target	Stylesheet/rule which container you need to get.
	 * @return	{Mixed}			Container of given target.
	 */
	var GetSelectorsOf = ( function () {
		var data_key = namespace + 'rule-selector-list';
		return function GetSelectorsOf( rule ) {
			var value = rule[ data_key ];
			return value || ( Object.defineProperty( rule, data_key, { value: value = SplitSelector( rule.selectorText ) } ), value );
		};
	} ) ();

	/**
	 * Returns parent stylesheet of given object.
	 */
	var GetParentStyleSheet = ( function () {
		var self = GetParentStyleSheet;
		self.original = false;
		function GetParentStyleSheet( target ) {
			self.original = true;
			var result = target.parentStyleSheet;
			self.original = false;
			return result;
		};
		return self;
	} ) ();

	/**
	 * Returns owner node of given object.
	 */
	var GetOwnerNode = ( function () {
		var self = GetOwnerNode;
		self.original = false;
		function GetOwnerNode( target ) {
			self.original = true;
			var result = target.ownerNode;
			self.original = false;
			return result;
		};
		return self;
	} ) ();

	/**
	 * Get container of given rule/styleSheet.
	 * ownerRule is only for importRule, ownerNode is for styleSheet, parentRule and parentStyleSheet are for rule.
	 * @param	{Mixed}	target	Stylesheet/rule which container you need to get.
	 * @return	{Mixed}			Container of given target.
	 */
	function GetContainer( target ) { return target.parentRule || target.ownerRule || GetParentStyleSheet(target); };
	function GetLast( list ) { return list[ list.length - 1 ]; };

	/**
	 * Checks if current target exists.
	 * @param	{Mixed}	target	Target can be a rule or a stylesheet.
	 */
	function Exists( target ) {
		var node = null;
		target = SyncedSheets.originalOf( target, true );
		while( target = !( node = GetOwnerNode( target ) ) && GetParentStyleSheet( target ) );
		return !!node;
	};

	/**
	 * Checks if given rule/styleSheet is somehow a container for rules.
	 * @param	{Mixed}	value	Target can be a styleSheet or a rule.
	 */
	function IsContainer( value ) { return 'cssRules' in value; };

	/**
	 * Creates a hidden style sheet object.
	 * @param {String}			css_text	Contents of that stylesheet.
	 * @param {CSSStyleSheet}
	 */
	var PrivateStyleSheet = ( function () {
		var self = PrivateStyleSheet, 
			data_key = namespace + 'original-node';
		self.getOriginal = function ( node, or_given ) {
			return node[ data_key ] || (or_given && node);
		};
		function PrivateStyleSheet( css_text, original ) {
			var style_el = document.createElement( 'style' ), sheet;
			if( original )
				Object.defineProperty( style_el, data_key, { value: original } );
			style_el.innerHTML = css_text;
			GetLinksAndStyles.ignoreNode( style_el );
			Head.appendChild( style_el );
			sheet = style_el.sheet;
			Head.removeChild( style_el );
			return sheet;
		};
		return self;
	} ) ();

	/**
	 * Gives the style and link elements that contain in given target.
	 * @param	{Mixed}	target	A rule to get stylesheet of which.
	 * @return	{Array} 		Array of elements found.
	 */
	var GetLinksAndStyles = ( function () {
		var self = GetLinksAndStyles, 
			nodes_to_ignore = _();
		self.ignoreNode = function ( node ) { nodes_to_ignore[ ObjectID( node ) ] = 1; };
		function GetLinksAndStyles( target, not_self ) {
			var list = [];

			//	If given object does'nt support query selector method, 
			//	that means that this is not a html dom object.
			if( !('querySelectorAll' in target) )
				return list;
			if( !not_self && (target.tagName == 'LINK' || target.tagName == 'STYLE') )
				list.push( target );

			//	If this target is not LINK and STYLE either.
			if( !list.length ) 
				ArrayPush.apply( list, target.querySelectorAll( 'style, link' ) );

			//	If there are nodes that needs to be ignored.
			if( !IsObjectEmpty( nodes_to_ignore ) ) {
				var i = list.length;
				while( i-- ) {
					var node = list[ i ], 
						key = ObjectID( node, true );
					if( key && PopProp( nodes_to_ignore, key ) ) 
						RemoveFrom( list, i );
				}
			}
			return list;
		};
		return self;
	} ) ();
	var ControllerPair = ( function () {
		var self = _(), 
			storage = _();
		function ParentOf( controller, parent ) {
			var parent_given = arguments.length > 1, 
				key = ObjectID( controller, !parent_given || parent == null );
			if( parent_given ) {
				if( parent ) {
					return storage[ key ] = parent;
				} else if( key ) {
					return !!PopProp( storage, key );
				}
			}
			return key && storage[ key ];
		};
		self.save = function ( controller, parent ) { ParentOf( controller, parent ); };
		self.delete = function ( controller ) { ParentOf( controller, null ); };
		self.get = function ( controller ) { return ParentOf( controller ); };
		return self;
	} ) ();

	function ExtendedRule( rule, index, container ) {
		this.$ = rule;
		this.isString = IsString( this.$ );
		this.isRule = main.isRule( this.$ );
		this.container = container;
		this.index = index;
	};
	( function ( PROTOTYPE ) {
		PROTOTYPE.$ = null;
		PROTOTYPE.isRule = false;
		PROTOTYPE.isString = false;
		PROTOTYPE.container = null;
		PROTOTYPE.index = 0;
		PROTOTYPE.delete = function () {
			if( !this.isRule )
				return -1;
			var container = GetContainer( this.$ ), 
				pos = container == this.container ? main.searchNear( this.container, this.$, this.index ) : -1;
			if( pos != -1 ) {
				main.deleteRule( this.container, pos );
				this.$ = null;
				this.isRule = false;
			}
			return pos;
		};
		PROTOTYPE.replaceWith = function ( css_text ) {
			if( !this.isRule )
				return -1;
			var container = GetContainer( this.$ ), 
				pos = container == this.container ? main.searchNear( this.container, this.$, this.index ) : -1;
			if( pos != -1 ) {
				this.$ = main.replaceRule( this.container, css_text, pos );
				this.isRule = true;
			}
			return pos;
		};
		PROTOTYPE.insert = function () {
			if( !this.isString )
				return -1;
			var len = RulesOf( this.container ).length, 
				pos = this.index >= len ? len : this.index;
			this.$ = main.insertRule( this.container, this.$, pos );
			this.isRule = !(this.isString = false);
			return pos;
		};
	} ) ( InitProto( ExtendedRule ) );

	/**
	 * This is the main iterator for rules.
	 * It iterates through all or given set of rules recursively.
	 * @param	{Function}	step		Step handler to call for each found rule.
	 * @param	{Function}	callback	Callback function.
	 * @param	{UINT}		flags		Flags is used to set on which rules this should iterate. (optional)
	 *                       			Available types`
	 *                       				Pass this to force this function to iterate thought
	 *                          			KEYFRAMES_RULE	Keyframes rules.
	 *                          			KEYFRAME_RULE	Keyframe rules.
	 *                             			MEDIA_RULE		Media rules.
	 *										STYLE_RULE		Style rules.
	 *										IMPORT_RULE		Import rules.
	 * 									Additional flags`
	 * 										SKIP_INACTIVES	This one forces this function to skip inactive stylesheets/rules.
	 * 									Default set of flags is 
	 * @param	{Mixed}		item		Give item on which you want to iterate. (optional)
	 *                       			It also can be just a one rule and this will iterate 
	 *                       			throught all available stylesheet rules by default.
	 */
	var ForeachRule = ( function () {
		var self = ForeachRule, 

			custom_flags = main.SKIP_INACTIVES, 
			max_iterations = APIConfig.foreachIterationsPerThread, 

			iterators_queue = _();

		self.isActive = false;
		self.$ = null;
		function ExecuteNext() {
			var entry = ShiftObject( iterators_queue, true );
			if( entry ) {
				self.isActive = true;
				self.$ = entry;
				entry.start()
			} else {
				self.isActive = false;
				self.$ = null;
			}
		};

		//	Extended container class is used to iterate throught some item, 
		//	which had different rule list in the past, 
		//	and we need to iterate throught only old rule lists.
		//	It's a case when you change style elements innerHTML in IE and edge, 
		//	or you change link element's href attribute again in IE and edge.
		//	Browser changes rule list of CSSStyleSheet object, 
		//	which is attached to that link/style, 
		//	but it does'nt change the stylesheet object itself.
		function OlderSheet( sheet, list, tester ) {
			this.$ = sheet;
			this.cssRules = list;
			this.testerRule = tester;
		};
		( function ( PROTOTYPE ) {
			PROTOTYPE.$ = null;
			PROTOTYPE.cssRules = null;
			PROTOTYPE.testerRule = null;
		} ) ( InitProto( OlderSheet ) );

		//	This combines a style sheet object to rules, which is iterable.
		self.combineSheetWithRules = function ( sheet, list, tester ) {
			return new OlderSheet( sheet, list, tester );
		};

		//	Function cancels an iterator with the given ID.
		self.cancel = function ( id ) { PopProp( iterators_queue, id ).stop(); };
		function ForeachRule( handlers, flags, list, print_this ) {
			flags = flags >>> 0;
			if( list ) {
				if( !IsContainer( list ) ) {
					list = [ list ];
				} else if( !main.isLoaded( list ) ) {
					console.error( 'Given sheet/rule', list, 'is not loaded yet.' );
					return false;
				}
			}
			list = list || Containers.roots;

			//	Making an iterator.
			var iterator = new Iterator( list, flags )
				.onStart( handlers.start )
				.onStep( handlers.step )
				.onEnd( handlers.end )
				.onFilterEnd( handlers.filterEnd )
				.onContainerParse( handlers.containerParse )
				.onContainerEnter( handlers.enteringContainer );
			id = ObjectID( iterator );
			iterator.printChanger = print_this;

			iterators_queue[ id ] = iterator;
			if( !self.isActive ) 
				ExecuteNext();

			//	Returning iterator ID.
			return id;
		};
		function PopStack() {
			var stack = this.stateStack, 
				entry = stack.pop();
			if( entry ) {
				delete this.containerToState[ ObjectID( entry.container ) ];
				this._ = GetLast( stack );
			}
			return this._;
		};
		function Iterator( container, flags ) {
			flags = flags || 0;

			this.skipInactives = main.SKIP_INACTIVES & flags;

			//	Removing configuration flags. 
			//	Flags value must only contain rule types to work ok, 
			//	because code uses conditions which check emptyness of this flags, 
			//	to deside wether it needs to continue exeuction or skip it for a particular rule.
			this.types = (flags & ~custom_flags) || (main.STYLE_RULE | main.KEYFRAME_RULE);
			this.startHandlers = [];
			this.stepHandlers = [];
			this.endHandlers = [];
			this.filterEndHandlers = [];

			this.containerParseHandlers = [];
			this.containerEnterHandlers = [];

			//	Saving given container as the main one.
			this.mainContainer = container;
		};
		( function ( PROTOTYPE ) {
			PROTOTYPE.skipInactives = false;

			PROTOTYPE.parentIsAList = false;
			PROTOTYPE.globalIterator = false;

			PROTOTYPE.mainContainer = null;

			//	Rules that need's to be ignored or processed.
			PROTOTYPE.itemsToIgnore = null;
			PROTOTYPE.itemsToProcess = null;

			PROTOTYPE.startHandlers = null;
			PROTOTYPE.stepHandlers = null;
			PROTOTYPE.endHandlers = null;
			PROTOTYPE.filterEndHandlers = null;
			PROTOTYPE.containerParseHandlers = null;
			PROTOTYPE.containerEnterHandlers = null;

			//	This is the controller object.
			PROTOTYPE.$ = null;

			//	This is the state object.
			PROTOTYPE._ = null;

			PROTOTYPE.types = 0;
			PROTOTYPE.stateStack = null;
			PROTOTYPE.containerToState = null;

			PROTOTYPE.iterated = 0;
			PROTOTYPE.chunks = 0;
			PROTOTYPE.timeout = 0;

			PROTOTYPE.breaked = false;
			PROTOTYPE.cancelled = false;
			PROTOTYPE.continued = false;

			PROTOTYPE.parsedRules = null;

			function SaveHandler( container, handler ) {
				if( IsFunction( handler ) )
					this[ container ].push( handler );
				return this;
			};
			PROTOTYPE.onEnd = function ( handler ) { return SaveHandler.call( this, 'endHandlers', handler ); };
			PROTOTYPE.onStart = function ( handler ) { return SaveHandler.call( this, 'startHandlers', handler ); };
			PROTOTYPE.onStep = function ( handler ) { return SaveHandler.call( this, 'stepHandlers', handler ); };
			PROTOTYPE.onFilterEnd = function ( handler ) { return SaveHandler.call( this, 'filterEndHandlers', handler ); };
			PROTOTYPE.onContainerParse = function ( handler ) { return SaveHandler.call( this, 'containerParseHandlers', handler ); };
			PROTOTYPE.onContainerEnter = function ( handler ) { return SaveHandler.call( this, 'containerEnterHandlers', handler ); };

			PROTOTYPE.addParsedRule = function ( rule ) {
				var key = ObjectID( rule );
				this.parsedRules[ key ] = 0;
				delete this.itemsToProcess[ key ];
				return this;
			};
			PROTOTYPE.hasParsed = function ( rules ) {
				if( !IsArray( rules ) )
					rules = [ rules ];
				var container = this.parsedRules, 
					i = rules.length;
				while( i-- ) {
					var rule = rules[ i ], 
						key = ObjectID( rule, true );
					if( !HasOwn( container, key ) )
						RemoveFrom( rules, i );
				}
				return rules.length && rules || false;
			};
			PROTOTYPE.pushState = function ( target, type ) {
				if( this.continued )
					return false;

				var container = target, 
					array_like = !type && IsArrayLike( container ), 

					//	If container is just an array, or is a keyframes rule, then it's active by default, 
					//	in other cases, check it's activity.
					is_active = array_like || type == KEYFRAMES_RULE || Containers.isActive( target ), 
					initial_call = !this.stateStack && !type;

				//	It this is not the initial push and the main container of this iterator a is a list.
				if( type == IMPORT_RULE ) 
					container = target.styleSheet;

				//	If current container is inactive, ignore this rule if ignore wanted.
				if( !is_active && this.skipInactives || (
					!array_like && !Execute( this.containerEnterHandlers, [ container ], Execute.BREAK_ON_FALSE )
				) ) return false;

				//	If this is the initial push.
				if(	initial_call ) {
					this.parentIsAList = array_like;
					this.globalIterator = this.parentIsAList && this.mainContainer == document.styleSheets;
				}
				
				//	Initializing state stack.
				if( !this.stateStack ) {
					this.stateStack = [];
					this.containerToState = _();
				}
				this.stateStack.push( this._ = {
					container: container, 
					isStatic: !type, 
					list: array_like ? container : RulesOf( container, true ), 
					index: -1, 
					isActive: is_active
				} );
				this.containerToState[ ObjectID( container ) ] = this._;
				return true;
			};
			PROTOTYPE.popState = function ( check ) {
				if( !this.stateStack )
					return false;
				var checked = false;
				while( !check || (checked = this._.index >= this._.list.length) ) {
					check = true;

					//	Do this even if state is not popping because it's already processed.
					//	It's because if container is being popped, 
					//	it means that there's no need to process it now.
					this.addParsedRule( this._.container );

					//	Adding this container as a parsed one, because it was already parsed.
					if( checked ) {
						Execute( this.containerParseHandlers, [ this._.container ] );
						checked = false;
					}

					//	If there's not state left to load.
					if( !PopStack.call( this ) ) 
						return this.end();
				}
				return true;
			};
			PROTOTYPE.callStep = function ( type, rule, add_as_parsed ) {
				var key_text;
				switch( type ) {
					case STYLE_RULE:
						key_text = rule.selectorText; break;
					case KEYFRAME_RULE:
						key_text = rule.keyText; break;
					case KEYFRAMES_RULE:
						key_text = rule.name; break;
					case MEDIA_RULE:
						key_text = rule.media.mediaText; break;
				}

				//	Adding this rule and container to parsed rules list.
				if( add_as_parsed ) 
					this.addParsedRule( rule );
				Execute( this.stepHandlers, [ rule, type, key_text ], this.$ );

				//	Adding iterated rules count.
				this.iterated++;
				if( this.cancelled )
					this.stop();
				return !this.cancelled && !this.breaked;
			};
			PROTOTYPE.execute = function () {

				//	If this iterator must ignore inactive rules, 
				//	pop states untill we find a container that is active.
				if( this.skipInactives ) {
					while( !this._.isStatic && !Containers.isActive( this._.container ) )
						if( !this.popState() ) 
							return;
				}

				//	Iterating throught current list.
				while( (++this._.index) < this._.list.length ) {
					if( this.breaked ) {
						this.end();
						return;
					}
					this.breaked = false;
					this.continued = false;

					//	Geting current entry and collecting information about it.
					var entry = this._.list[ this._.index ], 
						is_sheet = main.isSheet( entry ), 
						type = is_sheet && -1 || entry.type, 
						is_keyframes, 
						type_f = !is_sheet && type_to_flag[ type ], 
						cont = this._.container, 
						do_ignore = Containers.isTesterRule( cont, entry ) || this.isIgnored( entry ) || (this._.isStatic && cont.testerRule == entry);

					//	If this item must be ignored, or it has already been parsed, ignore it.
					if( do_ignore || this.hasParsed( entry ) ) 
						continue;

					//	If this is not a stylesheet object
					switch( type ) {
						case KEYFRAMES_RULE:
							is_keyframes = true;
						case IMPORT_RULE:
						case MEDIA_RULE:
						case -1:

							//	Trying to load given container, this is to load all available medias.
							if( !is_keyframes && !Containers.load( entry, true ) ) 
								break;
							var push_state = (is_sheet || !is_keyframes || (main.KEYFRAME_RULE & this.types));

							//	Calling step handler for this entry, 
							//	and geting into a new container, if it is.
							(!is_sheet && (main.KEYFRAMES_RULE & this.types) && !this.callStep( type, entry, !push_state )) || 
							(push_state && this.pushState( entry, type ));

							break;
						case STYLE_RULE:
						case KEYFRAME_RULE:
							if( ( type_f & this.types ) && !this.callStep( type, entry, true ) && !this.popState() ) 
								return;
					}

					//	If iterations count reached it's limit.
					if( this.iterated >= max_iterations ) 
						break;
				}

				//	Popping state if this container is fully processed.
				if( !this.popState( true ) ) 
					return;

				//	Checking if this was the end of iterations, call the next part.
				if( this.iterated >= max_iterations ) {
					this.iterated = 0;
					this.chunks++;

					//	Processing next chunk of data after loopTimeout mss.
					this.timeout = Natives.$.setTimeout( function ( that ) {
						that.timeout = 0;
						that.execute();
					}, APIConfig.loopTimeout, this );
				} else {
					this.execute();
				}
			};

			function ExecuteIterator() { self.$.execute(); };
			PROTOTYPE.start = function () {
				if( !this.pushState( this.mainContainer ) ) {
					ExecuteNext();
				} else {
					this.$ = new Controller( this );
					this.parsedRules = _();

					this.itemsToIgnore = _();
					this.itemsToProcess = _();

					Execute( this.startHandlers, [ this.$ ] );
					Natives.$.setTimeout( ExecuteIterator );
				}
			};

			PROTOTYPE.stop = function () { while( this.popState() ); };
			PROTOTYPE.end = function () {
				Execute( this.endHandlers, [ this.$ ] );

				//	Filtering rules that were not ignored.
				for( var key in this.itemsToIgnore ) 
					if( this.hasParsed( this.itemsToIgnore[ key ] ) )
						delete this.itemsToIgnore[ key ];

				//	Calling filtering end handlers, passing rules that need to be processed.
				if( !IsObjectEmpty( this.itemsToProcess ) || !IsObjectEmpty( this.itemsToIgnore ) ) 
					Execute( this.filterEndHandlers, [ this.itemsToProcess, this.itemsToIgnore ] );

				//	Clearing possible active timeout of execute function.
				if( this.timeout ) {
					Natives.$.clearTimeout( this.timeout );
					this.timeout = 0;
				}
				this.parsedRules = null;
				this.itemsToIgnore = null;
				this.itemsToProcess = null;

				this.stateStack = null;
				this.containerToState = null;
				this._ = null;
				this.breaked = false;
				this.continued = false;

				//	Calling end handler.
				ControllerPair.delete( this.$ );

				//	Executing next queued ForeachRule call.
				ExecuteNext();
				return false;
			};

			PROTOTYPE.itemAdded = function ( container, item, index ) {
				var key = ObjectID( container, true ), 
					entry = key && this.containerToState[ key ];
				if( entry && entry.index >= index ) 
					entry.index++;
			};
			PROTOTYPE.itemDeleted = function ( container, item, index ) {
				var key = ObjectID( container, true ), 
					entry = key && this.containerToState[ key ];
				if( entry && entry.index >= index ) {
					entry.index--;
				}
			};

			PROTOTYPE.ignoreItem = function ( item ) {
				if( !IsArrayLike( item ) )
					return;

				var native = item;

				//	There is a class called OldeSheet, 
				//	it's used to iterate through a stylesheet with it's old set of rules.
				if( native instanceof OlderSheet )
					native = native.$;

				//	If given target is an import rule, 
				//	we need to find it's styleSheet because we keep 
				//	only styleSheet of the import rule in state stack.
				if( main.isRule( native ) && native.type == IMPORT_RULE ) 
					native = native.styleSheet;

				//	Adding this rule to ignore list.
				var key = ObjectID( native ), 
					stack = this.stateStack, 
					i = 0;

				//	Rule keys which need to be ignored.
				this.itemsToIgnore[ key ] = item;

				//	Popping all states till this iterator get's out of given rule, 
				//	if it's currently inside of it.
				var state = this.containerToState[ key ];
				if( state ) {
					var i = stack.indexOf( state );
					while( i-- ) 
						if( !this.popState() )
							break;
				}
			};
			PROTOTYPE.processItem = function ( rule ) {
				if( !IsArrayLike( rule ) && !this.hasParsed( rule ) ) 
					this.itemsToProcess[ ObjectID( rule ) ] = rule;
			};
			PROTOTYPE.isIgnored = function ( rule ) {
				var key = ObjectID( rule, true );
				return key && !!PopProp( this.itemsToIgnore, key );
			};

			//	Controller object which will be passed to a step handlers.
			//	It gives information about current item, 
			//	current container and index of that item in that container, and so on...
			//	Also you can break or continue the current loop using that methods.
			function Controller( parent ) { ControllerPair.save( this, parent ) };
			( function ( PROTOTYPE ) {
				PROTOTYPE.active = function () { return ControllerPair.get( this )._.isActive };
				PROTOTYPE.container = function () { return ControllerPair.get( this )._.container; };
				PROTOTYPE.list = function () { return ControllerPair.get( this )._.list; };
				PROTOTYPE.index = function () { return ControllerPair.get( this )._.index; };
				PROTOTYPE.cancel = function () { ControllerPair.get( this ).cancelled = true; };
				PROTOTYPE.break = function () { ControllerPair.get( this ).breaked = true; };
				PROTOTYPE.continue = function () { ControllerPair.get( this ).continued = true; };
			} ) ( InitProto( Controller ) );
			self.Controller = Controller;
		} ) ( InitProto( Iterator ) );
		return self;
	} ) ();

	/**
	 * Calls change listeners.
	 * @param	{Mixed}	target Target can be stylesheet or a rule.
	 * @param {[type]} added  [description]
	 */
	var Listeners = ( function () {
		var self = _(), 

			all_types = main.KEYFRAMES_RULE | main.IMPORT_RULE | main.MEDIA_RULE | main.STYLE_RULE | main.KEYFRAME_RULE, 
			handlers = _();

		//	Is listeners API calling changes now.
		self.isActive = false;
		self.has = false;

		function ExecuteOn( target, added ) {
			if( !self.has )
				return;


			//	In case of remove action, we need to ignore 
			//	import and media rule because that changes will 
			//	be automaticly called by listener. In other case, 
			//	we will iterate throught import and media rules, 
			//	to load that rules too, if they'r not loaded yet.
			var loop_flags = main.KEYFRAMES_RULE | main.KEYFRAME_RULE | main.STYLE_RULE;
			if( added ) 
				loop_flags |= main.IMPORT_RULE | main.MEDIA_RULE;

			ForeachRule( {
				start: function () { self.isActive = true; }, 
				end: function () { self.isActive = false; }, 
				step: function ( rule, type, key_text ) {
					Execute( handlers, [ added, rule, type, key_text ], this );
				}, 
				filterEnd: function ( to_process, to_ignore ) {
					for( var key in to_process )
						ExecuteOn( to_process[ key ], true );

					for( var key in to_ignore )
						ExecuteOn( to_ignore[ key ], false );
					handler_set = false;
				}
			}, loop_flags, target );
		}
		self.execute = function ( target, added ) {

			//	ForeachRule iterator must ignore 
			//	this deleted target if it's active.
			if( ForeachRule.isActive || ChangeRules.has ) {

				//	Call this before ChangeRules executer, 
				//	because this ChangeRules execution will make ForeachRule iterator active.
				if( ForeachRule.isActive ) 
					ForeachRule.$[ added ? 'processItem' : 'ignoreItem' ]( target );

				//	If there is ChangeRules handler active, execute it on given target.
				if( added && ChangeRules.has ) 
					ChangeRules.executeOn( target );
			}
			ExecuteOn( target, added );
		};

		main.addListener = function ( name, handler, types ) {
			if( !IsFunction( handler ) )
				return false;

			//	If rules with particular types only wanted, hook this function to filter those types.
			types = types >>> 0;
			if( !types )
				types = all_types;

			if( !HasOwn( handlers, name ) ) 
				handlers[ name ] = [];
			handlers[ name ].push( Natives.hookFunction( handler, { fake: false }, function ( original ) {
				var active = !self.isActive;
				!active && ForeachRule.$.onEnd( function () { active = true; } );
				return function ( added, rule, type ) {
					return active && (type & types) && original.apply( this, arguments );
				};
			} ) );

			self.has = true;
			return true;
		};
		main.removeListener = function ( name ) {
			if( PopProp( handlers, name ) && IsObjectEmpty( handlers ) )
				self.has = false;
		};
		return self;
	} ) ();

	var SyncedSheets = ( function () {
		var self = _(), 

			data_key = namespace + 'synced-original-sheets', 
			original2fake = _();

		self.delete = function ( sheet ) {
			delete original2fake[ ObjectID( sheet[ data_key ] || sheet ) ];
		};
		self.fakedOf = function ( sheet ) {
			var key = ObjectID( sheet );
			return key && original2fake[ key ];
		};
		self.originalOf = function ( sheet, or_given ) {
			return sheet[ data_key ] || (or_given && sheet);
		};
		self.isFake = function ( sheet ) { return HasOwn( sheet, data_key ); };
		self.getPair = function ( sheet ) { return self.fakedOf( sheet ) || self.originalOf( sheet ); };
		self.add = function ( original, faked ) {
			original2fake[ ObjectID( original ) ] = faked;
			Object.defineProperty( faked, data_key, { value: original } );
		};
		return self;
	} ) ();

	var ParamCase = ( function () {
		var regex = /([A-Z]+)/g;
		function Replacer( x, y ) { return '-' + y.toLowerCase(); };
		return function ParamCase( property, important ) {
			return important ? property.replace( regex, Replacer ) : property;
		};
	} ) ();
	var CamelCase = ( function () {
		var regex = /(\-[a-z])/g;
		function Replacer( x ) { return x.slice(1).toUpperCase(); };
		return function CamelCase( property, important ) {
			return important ? property.replace( regex, Replacer ) : property;
		};
	} ) ();

	var GetEvent;
	var CSS = ( function () {
		var self = _();
		var Translate = ( function () {
			var prop_translation = {}, 
				self = Translate;
			function Translate( name ) {
				return prop_translation[ name ] || name;
			};
			self.add = function ( name, to_name ) {
				var names = [ CamelCase( name ), $.paramCase( name ) ];
					i = names.length;
				while( i-- ) {
					var name = names[ i ];
					if( !HasOwn( prop_translation, name ) )
						prop_translation[ name ] = to_name;
				}
			};
			self.has = function ( name ) { return HasOwn( prop_translation, name ); };
			return self;
		} ) ();
		var GetComputed = ( function ( data_key ) {
			return function GetComputedStyles( target ) {
				var value = target[ data_key ];
				if( !value )
					Object.defineProperty( target, data_key, { value: (value = window.getComputedStyle( target )) } );
				return value;
			};
		} ) ( 'computed-styles' );
		self.get = function ( target, names ) {
			var is_single = IsString( names );
			if( is_single ) 
				names = [ names ];
			var styles = GetComputed( target ), 
				result = _(), 
				i = 0;
			for( ; i < names.length; i++ ) {
				var name = names[ i ];
				result[ name ] = styles[ Translate( name ) ];
			}
			return is_single ? result[ name ] : result;
		};
		function IsValueEmpty( value ) { return value == null || value === ''; };
		function SetOneProperty( target, property, value, important ) {
			var property = Translate( property );
			if( IsValueEmpty( value ) ) {
				target.style[ property ] = '';
			} else {
				if( important ) {
					target.style.setProperty( ParamCase( property ), value, 'important' );
				} else {
					target.style[ property ] = value;
				}
			}
		}
		self.set = function ( target, values, important ) {
			for( var property in values ) {
				var value = values[ property ];
				SetOneProperty( target, property, value, important );
			}
			return target;
		};
		( function ( events, css_properties ) {
			GetEvent = function ( event ) { return event_translations[ event ] || event.toLowerCase(); };
			function GetFirst( target ) {
				for( var name in target )
					return target[ name ];
			};
			var IsSupported = ( function () {
				var example = document.createElement( '_' );
				return function IsSupported( property ) {
					return HasOwn( example.style, property );
				};
			} ) ();
			var i = css_properties.length, 
				event_translations = _();
			while( i-- ) {
				var properties = css_properties[ i ], 
					tester = GetFirst( properties );
				if( IsSupported( tester ) || !VendorPrefixes.try( tester, 'CSS', IsSupported ) )
					continue;

				//	If some prefix has been used to reach support, 
				//	save information of that prefix.
				var prefix = properties.all, 
					postfixes = events[ properties.all ], 
					i = postfixes.length;
				while( i-- ) {
					var event = prefix + postfixes[i];
					event_translations[ event.toLowerCase() ] = VendorPrefixes.make( event, 'event' );
				}
				for( var name in properties ) {
					var original = properties[ name ];
					Translate.add( original, VendorPrefixes.make( original, 'CSS' ) );
				}
			}
		} ) ( { transition: [ 'End' ], animation: [ 'Start', 'Iteration', 'End' ] }, [ {
			name: 'animation-name', 
			iterations: 'animation-iteration-count', 
			playState: 'animation-play-state', 
			duration: 'animation-duration', 
			delay: 'animation-delay', 
			direction: 'animation-direction', 
			easing: 'animation-timing-function', 
			fillMode: 'animation-fill-mode', 
			all: 'animation'
		}, {
			property: 'transition-property', 
			duration: 'transition-duration', 
			easing: 'transition-timing-function', 
			delay: 'transition-delay', 
			all: 'transition'
		} ] );
		return self;
	} ) ();

	var Containers = ( function () {
		var self = _(), 
			test_element = CSS.set( document.createElement( 'div' ), {
				height: '0px', 
				width: '0px', 
				position: 'fixed', 
				fontWeight: '100', 
				top: '0px', 
				left: '0px', 
				animation: APIConfig.sheetHookersAnimation + 'inactive 0.01ms linear 1 normal both'
			} ), 

			currently_loading = _(), 
			tester_rules = _(), 
			tester_node_to_container = _(), 
			containers = _();

		//	Container for root stylesheets.
		self.roots = [];

		//	Checks if given style sheet is currently in list.
		var Roots = ( function ( roots ) {
			var self = _(), 
				container = _();
			self.add = function ( sheet, dont_check ) {
				if( !dont_check && (!sheet.isStyleSheet || sheet.$.ownerRule || sheet.$.parentStyleSheet || !GetOwnerNode( sheet.$ )) )
					return false;

				//	If real stylesheet is given, use this in roots object.
				sheet = sheet.pair || sheet.$;
				var key = ObjectID( sheet );
				if( !HasOwn( container, key ) ) {
					container[ key ] = 1;
					roots.push( sheet );
					if( ForeachRule.isActive )
						ForeachRule.$.itemAdded( roots, sheet );
				}
				return true;
			};
			self.delete = function ( sheet ) {
				sheet = sheet.pair || sheet.$;
				var key = ObjectID( sheet, true );
				if( key && PopProp( container, key ) ) {
					RemoveFrom( roots, roots.indexOf( sheet ) );
					if( ForeachRule.isActive )
						ForeachRule.$.itemDeleted( roots, sheet );
				}
			};
			return self;
		} ) ( self.roots );

		function Save( sheet ) {
			Roots.add( sheet );
			containers[ ObjectID( sheet.$ ) ] = sheet;
		};
		function Delete( sheet ) {
			var key = ObjectID( sheet.$, true );
			if( key && PopProp( containers, key ) )
				Roots.delete( sheet );
		};
		function GetIfLoaded( sheet ) {
			var key = ObjectID( sheet, true );
			return key && containers[ key ];
		};

		var ObserveChanges = ( function ( parent ) {
			var self = ObserveChanges, 
				data_key = namespace + 'attr-change-mutation-observer', 
				link_flags = { attributes: true, attributesOldValue: true }, 
				style_flags = { childList: true };
			function ObserveChanges( target, is_style ) {
				var observer = target[ data_key ];
				if( !observer ) {
					if( arguments.length < 2 )
						is_style = target.tagName == 'STYLE';

					//	Observing target elemnet.
					Object.defineProperty( target, data_key, {
						value: observer = new Natives.$.MutationObserver( function () { parent.load( target ); } )
					} );
					observer.observe( target, is_style ? style_flags : link_flags );
				}
			};
			self.stop = function ( target ) {
				var observer = target[ data_key ];
				if( observer ) 
					observer.disconnect();
				return !!observer;
			};
			return self;
		} ) ( self );

		function ExtendedContainer( sheet ) {
			this.$ = sheet;
			this.isStyleSheet = main.isSheet( sheet );
			var node = GetOwnerNode( sheet );
			this.isStyleNode = node && node.tagName == 'STYLE';
			this.loaded();
		}
		( function ( PROTOTYPE ) {
			PROTOTYPE.$ = null;

			PROTOTYPE.rules = null;
			PROTOTYPE.rulesArray = null;

			PROTOTYPE.isStyleSheet = false;
			PROTOTYPE.isStyleNode = false;

			PROTOTYPE.loaded = false;
			PROTOTYPE.listening = false;
			PROTOTYPE.isActive = false;
			PROTOTYPE.firstChange = false;
			PROTOTYPE.ignoreFirstEnable = false;

			PROTOTYPE.pair = null;

			PROTOTYPE.testerRule = null;
			PROTOTYPE.testerNode = null;

			PROTOTYPE.loaded = function () {
				if( this.isStyleSheet && !this.rules ) {
					this.rules = RulesOf( this.$ );
					if( this.isStyleNode && this.rules ) 
						this.rulesArray = Slice( this.rules );
				}
			};
			PROTOTYPE.isLoaded = function () { return main.isLoaded( this.pair || this.$ ); };

			function IsSheetActive( node ) { return node && CSS.get( node, 'font-weight' ) == '200'; };
			PROTOTYPE.updateActivity = function () {
				return this.isActive = IsSheetActive( this.testerNode );
			};
			function AnimationListener() {
				var was_active = this.isActive;
				this.updateActivity();

				//	Checking if this stylesheet was deleted.
				if( !this.isActive && !Exists( this.$ ) ) 
					this.delete();

				var first_time = this.firstChange, 
					ignore_enable = first_time && this.ignoreFirstEnable;
				if( first_time ) {
					this.firstChange = false;
					this.ignoreFirstEnable = false;
				}

				//	If status has been changed, call listeners.
				if( (this.isActive ^ was_active) || (first_time && !ignore_enable && this.isActive) ) {
					Listeners.execute( this.pair || this.$, this.isActive );
				}
			};

			//	Binding transitionend to this test element, 
			//	to capture activation and deactivation of current sheet.
			document.addEventListener( GetEvent( 'animationend' ), function ( event ) {
				var target = event.target, 
					key = ObjectID( target, true ), 
					sheet = key && tester_node_to_container[ key ];
				if( sheet ) 
					AnimationListener.call( sheet, sheet.isActive );
			}, true );
			PROTOTYPE.insertRule = function ( css_text, pos ) {
				if( arguments.length < 2 ) {
					var rules = RulesOf( this.pair || this.$ );
					pos = rules && rules.length || 0;
				}
				var native = main.insertRule( this.$, css_text, pos );
				return native && new ExtendedRule( native, pos, this.$ ) || native;
			};
			PROTOTYPE.deleteRule = function ( pos ) {
				var sheet = this.pair || this.$;
				if( arguments.length < 2 )
					pos = sheet.length - 1;
				return main.deleteRule( sheet, pos );
			};
			PROTOTYPE.listen = function ( ignore_first_enable ) {
				if( this.listening )
					return this.updateActivity();

				//	Binding hooks.
				var key = ObjectID( this.$ ), 
					hooker_class = APIConfig.testerClass + key, 

					//	Appending new rules to given styleSheet.
					//	Also this will now allow to remove those rules from outside.
					rule = this.insertRule( '.' + hooker_class + '{animation-name:' + APIConfig.sheetHookersAnimation + 'active!important;font-weight:200!important;}' ), 
					node = test_element.cloneNode();

				node.classList.add( hooker_class );
				Body.appendChild( node );

				//	If rule is inserted, but cssRules object is not available, 
				//	it will return null instead of that rule object.
				//	This situation means that sheet is working, but something prevents it's cssRules to be available.
				//	One of that cases is when link's href attribute contains a css rules list.
				//	In that case this stylesheet must have been paired already, but it's not, 
				//	so thit is a test call of listen method.
				var is_active = IsSheetActive( node );
				if( !rule ) {
					this.deleteRule( 0 );
					Body.removeChild( node );
					return is_active;
				}
				this.isActive = is_active;
				this.testerRule = rule;
				this.testerNode = node;

				//	Try to load information about this stylesheet object.
				this.loaded();
				this.listening = true;
				this.firstChange = true;
				this.ignoreFirstEnable = !!ignore_first_enable;

				//	Saving information about current stylesheet's testers.
				tester_rules[ ObjectID( rule.$ ) ] = 0;
				tester_node_to_container[ ObjectID( node ) ] = this;
				Save( this );
				return is_active;
			};
			PROTOTYPE.pairWith = function ( css_text, original ) {
				if( this.pair ) {
					console.error( 'Cannot pair already paired stylesheet' );
				} else if( !this.isStyleSheet ) {
					console.error( 'Pairing is allowed only on stylesheet objects' );
				} else {
					var faked = PrivateStyleSheet( css_text, original ), 
						rules = faked && RulesOf( faked );
					if( faked && rules.length ) {
						SyncedSheets.add( this.$, faked );
						this.pair = faked;
						return true;
					} else {
						console.error( 'Couldn\'t fake a stylesheet', css_text );
					}
				}
				return false;
			};
			PROTOTYPE.delete = function () {
				if( !this.listening )
					return;
				var node = this.testerNode;
				node.parentNode.removeChild( node );
				delete tester_node_to_container[ ObjectID( node ) ];

				//	Removing all tester rules made for this stylesheet.
				delete tester_rules[ ObjectID( this.testerRule.$ ) ];
				this.testerRule.delete();

				//	Resetinng all properties of this object.
				this.rules = null;
				this.firstChange = true;
				this.ignoreFirstEnable = false;
				this.listening = false;

				//	Reseting pair information.
				this.pair = null;
				this.testerNode = null;
				this.testerRule = null;

				//	Removing test element.
				Delete( this );
				SyncedSheets.delete( this.$ );
			};
			PROTOTYPE.checkChanges = function () {
				if( !this.listening || !this.isStyleSheet ) 
					return;
				var new_rules = RulesOf( this.$ );

				//	If both rules are null, check if activity state of this sheet has been changed during this check, 
				//	which will mean that new rules are available to parse or this stylesheet just have been deleted.
				if( this.rules || new_rules ? (this.rules == new_rules) : (this.isActive == this.updateActivity()) ) 
					return;
				var item = ForeachRule.combineSheetWithRules( this.$, this.pair && RulesOf( this.pair ) || this.rulesArray || this.rules, this.testerRule );

				//	Deleting this stylesheet object.
				this.delete();
				Listeners.execute( item, false );
				return true;
			};
		} ) ( InitProto( ExtendedContainer ) );

		function GetSheetOf( target, is_node, is_import, is_style ) {
			var sheet = is_node || is_import ? target[ is_node ? 'sheet' : (is_import && 'styleSheet') ] : target;
			return (sheet && (sheet = SyncedSheets.originalOf( sheet, true ))) && (GetIfLoaded( sheet ) || new ExtendedContainer( sheet ));
		};
		function OpenXHR( xhr, method, action ) {
			try { xhr.open( method, action ); } catch( err ) { return false; }
			return true;
		};
		function StopCurrentLoader( key ) {
			var loader = PopProp( currently_loading, key );
			if( loader )
				loader( true );
		};

		self.load = function ( target, ignore_first_load ) {
			var is_node = IsElement( target, true ), 
				is_link = is_node && target.tagName == 'LINK', 
				is_style = is_node && !is_link && target.tagName == 'STYLE', 
				is_sheet = !is_node && main.isSheet( target ), 
				is_rule = !is_node && !is_sheet && main.isRule( target ), 
				is_import = is_rule && target.type == IMPORT_RULE, 
				is_media = is_rule && target.type == MEDIA_RULE, 
				target_key = ObjectID( target ), 
				succeed = false;

			//	If given target is not a node containing a sheet, not a sheet too, 
			//	Or if it's the main stylesheet of this API.
			if( (!is_link && !is_style && !is_import && !is_sheet && !is_media) || 
				(is_style && target == APIStyleNode) || 
				(is_sheet && target == APIStyleNode.sheet) || 
				(is_import && HasOwn( currently_loading, target_key ))
			) return false;

			//	Observing node for attribute changes.
			if( is_node )
				ObserveChanges( target );

			//	Checking if this stylesheet object is already loaded, returning false.
			var sheet = GetSheetOf( target, is_node, is_import, is_style );
			sheet && sheet.checkChanges();

			//	Stopping current loader handler.
			StopCurrentLoader( target_key );

			//	Getting extended sheet object.
			if( (succeed = is_media || (sheet && sheet.isLoaded())) || (is_link && !sheet && (target.rel.indexOf( 'stylesheet' ) == -1 || !target.href)) ) {
				succeed && sheet.listen( ignore_first_load || is_media );
				return succeed;
			}
			if( is_link ) {
				var ended = false, 
					xhr_sent = false, 
					last_checks = 0, 
					events = [ 'load', 'error' ], 
					ender = function () { ended = true; };

				//	HACK!
				//	We use XMLHttpRequest to detect if given href is available, because load and error events are not reliable ones.
				//	We send request to given href and wait for an answer.
				//	When answer comes, we wait for some time, and it MUST become ready.
				var xhr = new XMLHttpRequest(), 
					i = 0;
				for( ; i < events.length; i++ )
					target.addEventListener( events[ i ], ender, true );

				//	NOTE: we also need to check if there is any import rule written in XHR object.
				xhr.addEventListener( 'loadend', ender );

				//	Opening GET request with given href, and sending it.
				//	If it fails to open, there is a chance, that given href is not a URL, it's a stylesheet source, 
				//	so we must try to load it using decodeURIComponent.
				if( xhr_sent = OpenXHR( xhr, 'GET', target.href ) )
					xhr.send();
			}
			var interval = Natives.$.setInterval( currently_loading[ target_key ] = function ( stop_checking ) {
				if( !stop_checking ) {
					if( !sheet )
						sheet = GetSheetOf( target, is_node, is_import, is_style );
					succeed = sheet && sheet.isLoaded();

					//	If stylesheet for given link is not loaded yet.
					if( succeed ) {
						sheet.listen();
					} else {

						//	If XMLHttpRequest ended, end this checking after the next 2 iterations.
						if( is_link ) {
							if( !ended && (!xhr_sent || xhr.readyState == XMLHttpRequest.DONE) ) {
								ended = true;
								last_checks += 2;
								return;
							} else if( !ended || last_checks-- >= 0 ) {
								return;
							}
						} else {
							ended = true;
						}

						//	If XHR request is ready, but stylesheet is still inactive by standart check, 
						//	check if it's active by checking insertRule methods on it, 
						//	then try to create a stylesheet using a response text.
						var is_active = false, 
							listening = !!sheet;

						if( listening ) {
							try { is_active = sheet.listen(); } catch( err ) { listening = false; }
						}

						if( !listening ) 
							return;

						//	If given target is a link element and given sheet is active, but cssRules are not accessible.
						//	NOTE: In chrome and IE you cannot access link's stylesheet cssRules object, 
						//	if it's href is a CSS text.
						//	In IE it even throws errror.
						succeed = true;
						if( is_link && !sheet.listening ) {
							var potential_css = xhr_sent && xhr.responseText;
							if( !potential_css ) {
								var pos = target.href.indexOf( ',' );
								potential_css = pos != -1 && decodeURIComponent( target.href.slice( pos + 1 ) );
							}

							//	Trying to pair given stylesheet object.
							if( sheet.pairWith( potential_css, target ) ) 
								sheet.listen();
						}
					}
				}

				//	Loading of this element has ended, 
				//	so delete this node information from currently loading nodes array.
				delete currently_loading[ target_key ];
				if( is_link ) {

					//	Clearing all information about this node loading.
					xhr.abort();

					//	Unbinding event handlers of this element.
					for( ; i < events.length; i++ )
						target.removeEventListener( events[ i ], ender, true );
				}

				//	Claring checker interval.
				Natives.$.clearInterval( interval );
			}, APIConfig.loadCheckInterval );
			return false;
		};
		function CancelLoading( target ) {
			var key = ObjectID( target, true );
			if( key ) {
				StopCurrentLoader( key );
				ObserveChanges.stop( target );
			}
		};
		self.isActive = function ( target ) {
			if( !target )
				return false;

			var is_import, is_media, is_sheet = main.isSheet( target ), 
				is_rule = !is_sheet && main.isRule( target ) && ( (
					is_import = target.type == IMPORT_RULE ) || (
					is_media = target.type == MEDIA_RULE ) );
			if( !is_rule && !is_sheet ) 
				return false;

			target = SyncedSheets.originalOf( target, true );
			var key = ObjectID( target, true );
			return key && HasOwn( containers, key ) ? containers[ key ].isActive : self.load( target, true );
		};
		self.isTesterRule = function ( container, rule ) {
			var rule_key = ObjectID( rule, true );
			return rule_key && HasOwn( tester_rules, rule_key );
		};

		//	If createStyleSheet method is available, hook it to detect new stylesheets inserted using this method.
		Natives.hook( 'document.createStyleSheet', function ( original ) {
			return function () {
				var result = original.apply( this, arguments );
				self.load( result );
				return result;
			};
		} );

		( function () {
			var containers = { 'CSSStyleSheet': [ 'insertRule', 'deleteRule', false ] };
			if( Natives.$.CSSMediaRule ) 
				containers[ 'CSSMediaRule' ] = [ 'insertRule', 'deleteRule', false ];
			if( Natives.$.CSSKeyframesRule ) 
				containers[ 'CSSKeyframesRule' ] = [ ['appendRule', 'insertRule'], 'deleteRule', true ];

			//	This is used to get a rule from given container of given index.
			function GetRule( container, i, keyframes ) {
				return keyframes ? 
					container.findRule( i ) : ( 
					container = RulesOf( container ), 
					i = container.length > 0 && (isNaN( i ) ? (container.length - 1) : (i >=0 && i < container.length && i)), 
					i !== false && container[ i ] );
			};
			function IsContainerLoaded( sheet ) {
				var key = ObjectID( sheet, true );
				return key && HasOwn( containers, key );
			};

			//	Saving needed native APIs into Natives.
			for( var container in containers ) {
				var info = containers[ container ], 
					adders = info[0], 
					remover = info[1], 
					keyframes = info[2];

				//	Container used to get inserting and removing methods.
				container += '.prototype.';

				//	Hooking insertRule functionality.
				if( !IsArray( adders ) )
					adders = [ adders ];
				adders.forEach( function ( adder ) {
					Natives.hook( container + adder, function ( original, keyframes ) {
						return function ( css_text, index ) {
							index = !keyframes && HasToString( index ) && parseInt( index ) >>> 0;
							var try_to_predict = IsContainerLoaded( this ) || self.load( this, true ), 
								faked = try_to_predict && SyncedSheets.fakedOf( this ), 

								//	Getting all information regarding to this action.
								ex_rule = try_to_predict && GetRule( faked || this, index ), 
								result = original.apply( this, arguments );

							//	If there's no need to try to predict anything.
							if( !try_to_predict )
								return result;

							//	If this container exists, 
							//	ex rule with this index is different than this one, 
							//	and this rule is not import or media rule, call listeners.
							faked && original.apply( faked, arguments );
							var rule = GetRule( faked || this, index );
							if( Exists( this ) && (rule !== ex_rule || (!rule && !ex_rule)) ) {

								//	If iterator is currently active, inform it about this change.
								if( ForeachRule.$ )
									ForeachRule.$.itemAdded( faked || this, rule, index );

								//	If this is not an rule, which must be loaded, OR it's already loaded, execute listeners for this entry.
								if( rule.type != IMPORT_RULE || self.load( rule, true ) )
									Listeners.execute( rule, true );
							}
							return result;
						}
					}, keyframes );
				} );

				//	Hooking deleteRule functionality.
				Natives.hook( container + remover, function ( original, keyframes, remover ) {
					return function ( index ) {
						if( !keyframes )
							index = HasToString( index ) && parseInt( index ) >>> 0;

						var result, 
							try_to_predict = keyframes || IsContainerLoaded( this ) || self.load( this, true ), 
							faked = try_to_predict && !keyframes && SyncedSheets.fakedOf( this ), 

							//	Trying to get a rule with given index.
							rule = try_to_predict && GetRule( faked || this, index, keyframes );
						if( keyframes || !rule || !self.isTesterRule( this, rule ) ) {

							//	If container from which this rule removed is active, 
							//	and this rule is not import or media rule, 
							//	or it's have not been loaded by sheet listener, call listeners.
							var result = original.apply( this, arguments );
							if( Exists( this ) ) {
								faked && original.apply( faked, arguments );
								if( rule !== GetRule( faked || this, index, keyframes ) ) {
									if( ForeachRule.$ ) 
										ForeachRule.$.itemDeleted( faked || this, rule, index );

									if( (rule.type != IMPORT_RULE && rule.type != MEDIA_RULE) || !HasOwn( sheet_activity, ObjectID( rule ) ) )
										Listeners.execute( rule, false );
								}
							}
						}
						return result;
					}
				}, keyframes, remover );
			}
		} ) ();
		self.initialize = function () {

			//	Hooking parentStyleSheet method.
			//	Doing it in this way, because mozilla behaves very weired 
			//	according to parentStyleSheet getter function interface.
			( function ( method ) {

				//	Creating a test CSSStyleRule object.
				var rule = main.insertRule( APIStyleNode.sheet, '#some-' + RandomString() + '{display:block}', 0 ), 
					proto = Natives.findProto( rule, method ), 
					descriptor = Object.getOwnPropertyDescriptor( proto, method );

				main.deleteRule( APIStyleNode.sheet, 0 );
				function Hooker( original ) {

					//	Hooking GetParentStyleSheet method to 
					//	return only original parentStyleSheet object for inner use.
					return function () {
						var result = original.apply( this, arguments );
						if( result && !GetParentStyleSheet.original )
							result = SyncedSheets.originalOf( result, true );
						return result;
					};
				}


				//	Rewriting parentStyleSheet getter function here.
				descriptor.get = Natives.hookFunction( descriptor.get, { save: true }, Hooker );
				Object.defineProperty( proto, method, descriptor );

				Natives.hook( 'StyleSheet.prototype.parentStyleSheet > get', Hooker );
				Natives.hook( 'StyleSheet.prototype.ownerNode > get', function ( original ) {
					return function () {
						var result = original.apply( this, arguments );
						if( result && !GetOwnerNode.original )
							result = PrivateStyleSheet.getOriginal( result, true );
						return result;
					};
				} );
			} ) ( 'parentStyleSheet' );

			//	Initializing root style sheets container.
			Slice( document.styleSheets ).forEach( function ( sheet ) {
				self.load( sheet, true );
			} );

			//	Geting all style and link elements.
			GetLinksAndStyles( document, true ).forEach( function ( element ) {
				self.load( element, true );
			} );

			//	Binding mutation observer to document to detect new stylesheets and deleting stylesheets.
			new Natives.$.MutationObserver( function ( mutations ) {
				var i = 0;
				for( ; i < mutations.length; i++ ) {
					var mutation = mutations[ i ], 
						targets = [ mutation.addedNodes, mutation.removedNodes ], 
						j = 0;
					for( ; j < targets.length; j++ ) {
						var list = targets[j], 
							k = 0;
						for( ; k < list.length; k++ ) {
							var elements = GetLinksAndStyles( list[k] );
								l = 0;
							for( ; l < elements.length; l++ ) {
								var element = elements[ l ];
								if( HTML.contains( element ) ) {
									self.load( element );
								} else {
									CancelLoading( element );
								}
							}
						}
					}
				}
			} ).observe( document, { childList: true, subtree: true } );
		};

		return self;
	} ) ();

	function ExecuteRuleChanger( container, method, args, ignore_pair ) {
		var real_cont = container, 
			changer = container[ method ], 
			original = changer && Natives.originalOf( changer );
		if( !ignore_pair ) {
			var pair = SyncedSheets.getPair( container );
			if( pair ) {
				if( SyncedSheets.isFake( pair ) )
					real_cont = pair;
				ExecuteRuleChanger( pair, method, args, true );
			}
		}
		if( original ) {
			original.apply( container, args );
		} else {
			console.error( method, 'is not supported for given value' );
		}
		return !!original && real_cont;
	};
	main.insertRule = function ( container, css_text, pos ) {
		var real = ExecuteRuleChanger( container, 'insertRule', [ css_text, pos ] ), rules;
		return real && (rules = RulesOf( real )) && rules[ pos ] || null;
	};
	main.deleteRule = function ( container, pos ) {
		return ExecuteRuleChanger( container, 'deleteRule', [ pos ] ) && true;
	};
	main.replaceRule = function ( container, css_text, pos ) {
		return main.deleteRule( container, pos ) && main.insertRule( container, css_text, pos );
	};
	main.searchNear = function ( container, target, position ) {
		if( GetContainer( target ) != container )
			return -1;
		var rules = RulesOf( container ), 
			li = rules.length - 1;

		if( !rules.length )
			return -1;

		if( position > 0 ) {
			position = 0;
		} else if( position < li ) {
			position = li;
		} else if( rules[ position ] === target ) {
			return position;
		}

		var is = [ [ position, 1 ], [ position, -1 ] ];
		while( is.length ) {
			var i = is.length;
			while( i-- ) {
				var item = is[ i ];
				item[0] += item[1];
				if( item[0] < 0 || item[0] > li ) {
					RemoveFrom( is, i );
				} else if( rules[ item[0] ] === target )
					return item[0];
			}
		}
		return -1;
	};

	/**
	 * ChangeRules subAPI is for changing css style rules.
	 */
	var ChangeRules = ( function () {
		var self = ChangeRules, 
			changer = null, 
			undoing = false;

		//	Is this active.
		self.isActive = false;
		self.has = false;

		function CSSText( selector, styles ) { return selector + '{' + styles + '}'; };
		var Changes = ( function () {
			var self = _();

			self.inserts = [];
			self.replaces = [];
			self.deletes = [];

			function SaveRule( storage, rule, index, container ) {
				var i = storage.length;
				storage.push( new ExtendedRule( rule, index, container ) );
				return i;
			};
			self.replace = function ( ex_css_text, new_rule, index, container ) {
				var i = SaveRule( self.replaces, new_rule, index, container );
				self.replaces[i] = [ ex_css_text, self.replaces[i] ];
			};
			self.insert = function ( new_rule, index, container ) {
				return SaveRule( self.inserts, new_rule, index, container );
			};
			self.delete = function ( css_text, index, container ) {
				return SaveRule( self.deletes, css_text, index, container );
			};
			return self;
		} ) ();
		function ChangeRules( callstep, callwhens ) {
			if( self.has ) {
				console.error( 'There can be one rule changer at a time.' );
				return false;
			}
			changer = new StyleChanger( callstep, callwhens.start, callwhens.end );
			self.has = true;
			if( !undoing )
				changer.start();
			return true;
		};

		function StyleChanger( callstep, callstart, callback ) {
			this.callstep = callstep;
			this.parsedContainers = _();
			if( IsFunction( callstart ) )
				this.callstart = callstart;
			if( IsFunction( callback ) )
				this.callback = callback;
		}
		( function ( PROTOTYPE ) {
			PROTOTYPE.callstep = null;
			PROTOTYPE.callstart = null;
			PROTOTYPE.callback = null;

			PROTOTYPE.parsedContainers = null;

			PROTOTYPE.isActive = false;
			PROTOTYPE.$ = null;
			PROTOTYPE.start = function ( list ) {

				//	Maybe this one will wait too.
				var that = this, 
					key = list && ObjectID( list, true );
				if( !undoing && !HasOwn( this.parsedContainers, key ) ) {
					ForeachRule( {
						start: function ( $ ) {

							//	Reseting flags.
							self.isActive = that.isActive = true;

							//	Making controller object.
							that.$ = $;
							if( that.callstart )
								that.callstart.call( null );
						}, 
						step: function () {
							that.step.apply( that, arguments );
						}, 
						enteringContainer: function ( container ) {
							var key = ObjectID( container, true );
							return !key || !HasOwn( that.parsedContainers, key );
						}, 
						containerParse: function ( container ) {
							that.parsedContainers[ ObjectID( container ) ] = 0;
						}, 
						end: function () {
							ignore_till = -1;

							//	Reseting flags.
							self.isActive = that.isActive = false;

							//	Executing ending handlers.
							if( that.callback )
								that.callback.call( null );
						}, 
						filterEnd: function ( to_process ) {
							for( var key in to_process )
								that.start( to_process[ key ] );
						}
					}, main.SKIP_INACTIVES | main.STYLE_RULE, list, true );
				}
			};
			( function ( ignore_till ) {
				var Rule = ( function () {
					var self = _(), 

						old_selector, 
						old_style;

					self.newOnes = null;
					self.selector = null;
					self.deleted = false;

					self.$ = {
						$: null, 
						styles: null, 
						selectors: null, 
						delete: function () { self.deleted = true; }, 
						addAfterThis: function ( selector, style ) { self.newOnes.push( CSSText( selector, style || style_text ) ); }, 
						setSelector: function ( selector ) { self.selector = selector; }
					};
					self.set = function ( rule ) {

						//	Resting information.
						self.newOnes = [];
						self.selector = old_selector;
						self.deleted = false;
						self.changed = false;

						self.$.$ = rule;
						self.styles = rule.style;
						self.$.selectors = CopyArray( GetSelectorsOf( rule ) );

						old_selector = rule.selectorText;
						old_style = self.styles.cssText;
					};
					self.checkChanges = function () {
						self.changed = self.selector != old_selector || self.styles.cssText != old_style;
						return self.changed || self.deleted || self.newOnes.length;
					};
					self.restore = function ( dont_end ) {
						var native = self.$.$;
						if( native.selectorText != old_selector )
							native.selectorText = old_selector;
					};
					return self;
				} ) ();
				PROTOTYPE.step = function ( rule, type ) {
					var ex_rule_css = rule.cssText, 
						index = this.$.index();
					if( ignore_till >= index ) 
						return;

					Rule.set( rule );
					if( this.callstep.call( this.$, Rule.$, type ) === false || !Rule.checkChanges() ) {
						Rule.restore();
						return;
					}

					var container = this.$.container();
					if( Rule.deleted ) {

						//	Decrementing index for new rule insertion.
						Changes.delete( ex_rule_css, index--, container );
					} else if( Rule.changed ) {

						//	Replacing current rule, if it's changed.
						Changes.replace( ex_rule_css, main.replaceRule( container, CSSText( Rule.selector, Rule.styles.cssText ), index ), index, container );
					} else {
						Rule.restore();
					}

					//	New rules count.
					var new_rules = Rule.newOnes;
						j = index + 1, 
						i = 0;
					if( new_rules.length ) {

						//	Inserting new rules.
						for( ; i < new_rules.length; i++, j++ ) 
							Changes.insert( main.insertRule( container, new_rules[i], j ), j, container );	

						ignore_till = j;
					}
				};
			} ) ( -1 );
		} ) ( InitProto( StyleChanger ) );

		self.executeOn = function ( item ) {
			var execute = self.has && !self.isActive;
			if( execute )
				changer.start( item );
			return execute;
		};
		( function ( max_iterations, loop_timeout ) {
			var callbacks = [], 
				iterated = 0;
			function UndoIteration() {
				var next_thread = false, 

					replaces = Changes.replaces, 
					inserts = Changes.inserts, 
					deletes = Changes.deletes;
				if( replaces.length ) {
					while( replaces.length ) {
						var rule = replaces.pop();
						rule[1].replaceWith( rule[0] );

						if( next_thread = ++iterated >= max_iterations ) 
							break;
					}
					if( !next_thread ) {
						UndoIteration();
						return;
					}
				} else if( inserts.length ) {
					while( inserts.length ) {
						inserts.pop().delete();

						if( next_thread = ++iterated >= max_iterations ) 
							break;
					}
				} else if( deletes.length ) {
					while( deletes.length ) {
						deletes.pop().insert();

						if( next_thread = ++iterated >= max_iterations ) 
							break;
					}
				}
				iterated = 0;
				if( next_thread ) {
					Natives.$.setTimeout( UndoIteration, loop_timeout );
				} else {

					//	If a changer is currently running.
					self.has = false;
					changer = null;
					undoing = false;

					//	Executing ending handlers.
					Execute( callbacks );

					//	Clearing data.
					callbacks = [];
				}
				return false;
			};

			/**
			 * This discards all changes done, and stops the ones which are in a waiting state.
			 * @return {void}
			 */
			main.undoChanges = function ( on_end ) {
				if( !self.has ) 
					return false;

				if( self.isActive )
					ForeachRule.$.stop();

				if( IsFunction( on_end ) )
					callbacks.push( on_end );

				if( !undoing ) {
					undoing = true;

					//	Clearing changers list, because we dont need them anymore.
					Natives.$.setTimeout( UndoIteration );
				}
				return true;
			};
		} ) ( APIConfig.foreachIterationsPerThread, APIConfig.loopTimeout );
		return self;
	} ) ();

	var Initialize = ( function ( methods ) {
		var cachers = [];
		for( var name in methods ) {
			var cacher = CallCacher( methods[ name ] );
			cachers.push( cacher );
			main[ name ] = cacher.execute;
		};
		return function Initialize() {

			//	Geting body element.
			Body = document.querySelector( 'body' );
			Head = document.querySelector( 'head' );

			//	Creating hooker animation defining stylesheet object.
			APIStyleNode = document.createElement( 'style' );
			APIStyleNode.innerHTML = 
				'@keyframes ' + APIConfig.sheetHookersAnimation + 'active{0%{opacity:0;}100%{opacity:0.5;}}\
				@keyframes ' + APIConfig.sheetHookersAnimation + 'inactive{0%{opacity:0.5;}100%{opacity:1;}}';
			Head.appendChild( APIStyleNode );

			//	Initializing containers API, after waiting some time, 
			//	to let browser to render the style element made above.
			Natives.$.setTimeout( function () {

				//	Initializing stylesheet container.
				Containers.initialize();
				var i = 0;
				for( ; i < cachers.length; i++ ) 
					cachers[i].ready();
			}, 0 );
		};
	} ) ( {
		/**
		 * Use this function to iterate through all style rules and change them.
		 * @param  {Mixed}		changers	Handlers that will change rules, 
		 *                           		must contain at least selector condition, 
		 *                           		example`
		 *                           		{
		 *                           			selector: function (...) {...}, 
		 *                           			style: function (...) {...}, 
		 *                           		}
		 *                           		If function given, it will be considered as selector changer.
		 * @param  {Function}	callwhens	Callstart and callback handlers.
		 *                              	example`
		 *                              	{
		 *                              		start: function (...) {...}, 
		 *                              		end: function (...) {...}, 
		 *                              	}
		 *                           		If function given, it will be considered as callback.
		 * @return {void}
		 */
		change: function ( callstep, callwhens ) {
			if( IsFunction( callwhens ) )
				callwhens = { end: callwhens };
			ChangeRules( callstep, callwhens );
		}, 

		/**
		 * This iterates throught all available rules.
		 * @param {Mixed}	callwhens	Contains callstart, callback and a step handler, 
		 *                          	example`
		 *                           	{
		 *                           		start: function (...) {...}, 
		 *                           		step: function (...) {...}, 
		 *                           		end: function (...) {...}, 
		 *                           	}
		 *                           	If function given, it will be considered as step handler.
		 * @param {UINT}	flags		Types of rules that need to be parsed.
		 * @return {void}
		 */
		forEach: function ( callwhens, flags ) {
			if( IsFunction( callwhens ) )
				callwhens = { step: callwhens };
			ForeachRule( callwhens, flags );
		}
	} );

	//	Iterating throught wanted
	if( document.readyState == 'complete' ) {
console.log( 'Document is already loaded' );
		Natives.$.setTimeout( Initialize, 0 );
	} else {
console.log( 'Waiting for document ready' );
		document.addEventListener( 'DOMContentLoaded', Initialize );
	}
	return main;
} );
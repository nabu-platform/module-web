Vue.component("n-form-ace", {
	template: "<div class='is-form-ace'>"
		+ "	<div class='is-label-wrapper is-row is-spacing-gap-small' v-if='label'><label class='is-label'><span class='is-label-content' v-html='label'></span><n-info v-if='$slots[\"default\"]'><slot></slot></n-info></label><button @click='magnify' class='is-button is-size-xsmall is-variant-ghost'><icon name='search'/></button></div>"
		+ "	<div class='is-content-before' v-if='before' v-html='before'></div>"
		+ "	<div class='is-content-wrapper'>"
		+ "		<n-ace :mode='mode' :timeout='timeout' :value='value' v-bubble:input ref='ace' :placeholder='placeholder'/>"
		+ "	</div>"
		+ "	<n-messages :messages='messages' v-if='messages && messages.length'/>"
		+ "	<div class='is-content-after' v-if='after' v-html='after'></div>"
		+ "</div>",
	props: {
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		mode: {
			type: String,
			required: false,
			default: "javascript"
		},
		timeout: {
			type: Number,
			required: false,
			default: 300
		},
		before: {
			type: String,
			required: false
		},
		after: {
			type: String,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		},
		template: {
			type: Boolean,
			required: false
		}
	},
	data: function() {
		return {
			messages: []
		}
	},
	methods: {
		validate: function(soft) {
			return [];
		}, 
		magnify: function() {
			var self = this;
			this.$prompt(function() {
				var component = Vue.component("big-ace");
				var instance = new component({propsData: {value: self.value, mode: self.mode }});
				instance.$on("input", function(value) {
					self.$emit("input", value);
					// visually update the value
					self.$refs.ace.editor.setValue(value);
				})
				return instance;
			});
		}
	}
});
Vue.component("n-ace", {
	template: "<div class='n-ace'></div>",
	props: {
		value: {
			required: true
		},
		mode: {
			type: String,
			required: false,
			default: "scss"
		},
		timeout: {
			type: Number,
			required: false,
			default: 300
		},
		placeholder: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			editor: null,
			timer: null
		}
	},
	ready: function() {
		ace.require("ace/ext/language_tools");
		this.editor = ace.edit(this.$el);
		this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableSnippets: true,
			enableLiveAutocompletion: true,
			useSoftTabs: false,
			showInvisibles: false,
			scrollPastEnd: false,
			enableEmmet: false,
			// default scroll speed is _very_ fast for some reason
			scrollSpeed: 0.5,
			tabSize: 4,
			placeholder: this.placeholder
		});
		//this.editor.setTheme("ace/theme/monokai");
		var self = this;
		this.editor.getSession().on('change', function() {
			if (self.timer) {
				clearTimeout(self.timer);
				self.timer = null;
			}
			self.$emit("change", self.editor.getSession().getValue());
			if (self.timeout) {
				self.timer = setTimeout(function() {
					self.$emit("input", self.editor.getSession().getValue());
				}, self.timeout);
			}
			else {
				self.$emit("input", value);
			}
		});
		if (this.value) {
			// the -1 moves cursor to the start, if we use 1 it moves to the end
			this.editor.setValue(this.value, -1);
		}
		this.setMode(this.mode);
	},
	methods: {
		setMode: function(mode) {
			this.editor.getSession().setMode("ace/mode/" + mode);
		},
		insert: function(text) {
			this.editor.insert(text);
		}
	},
	watch: {
		mode: function(newValue) {
			this.editor.getSession().setMode("ace/mode/" + mode);
		}
	}
});
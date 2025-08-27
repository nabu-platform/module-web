Vue.view("page-markdown-text", {
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		rowHeight: function() {
			return Math.max(1, this.cell.state.content ? this.cell.state.content.length - this.cell.state.content.replace(/\n/g, "").length + 1 : 1);
		},
		formatted: function() {
			if (nabu.formatters && nabu.formatters.markdown) {
				var blocks = nabu.formatters.markdown.parse(this.cell.state.content);
				var parameters = {};
				var self = this;
				parameters.tagUrl = "http://google.com?q=";
				parameters.variables = {
					right: "left"
				}
				var result = nabu.formatters.markdown.asHtml(blocks, parameters);
				// if we have promises, we need to do some retroactive resolving
				if (Object.keys(result.promises).length > 0) {
					// we wait until at least this is rendered (just in case we have fast resolving promises)
					Vue.nextTick(function() {
						nabu.formatters.markdown.replacePromises(result.promises);
					})
				}
				return result.content;
			}
		}
	}
});


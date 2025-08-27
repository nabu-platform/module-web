// to be pageable we must be able to determine which page you are on
// and be able to jump to a random page

nabu.page.provide("page-specification", {
	name: "orderable",
	state: {
		order: {
			properties: {
				by: {
					type: "array",
					items: {
						type: "string"
					}
				}
			}
		}
	},
	actions: [{
		title: "Order By",
		name: "order-by",
		// order by a set of field or fields
		// for instance: name asc, created desc
		input: {
			by: {
				type: "array",
				items: {
					type: "string"
				}
			},
			// by default only the new order by is applied
			// but you can also combine it with the existing order by
			append: {
				type: "boolean"
			}
		}
	}, {
		title: "List available fields",
		name: "list-available",
		output: {
			available: {
				type: "array",
				items: {
					type: "string"
				}
			}
		}
	}]
});
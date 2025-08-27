// to be pageable we must be able to determine which page you are on
// and be able to jump to a random page

nabu.page.provide("page-specification", {
	name: "pageable",
	state: {
		paging: {
			properties: {
				// current page
				current: {
					type: "int64"
				},
				// the total amount of pages
				total: {
					type: "int64"
				},
				// how many items on a page
				pageSize: {
					type: "int64"
				},
				// the offset in rows
				rowOffset: {
					type: "int64"
				},
				// total amount of rows available
				totalRowCount: {
					type: "int64"
				}
			}
		}
	},
	actions: [{
		title: "Jump to page",
		name: "jump-page",
		input: {
			page: {
				type: "int64"
			}
		},
		// we could do a separate call, but especially when using dedicated buttons
		// it is much easier to combine this into a single call
		// the records are not useful at this point to be returned anyway
		output: {
			// current page
			current: {
				type: "int64"
			},
			// the total amount of pages
			total: {
				type: "int64"
			},
			// how many items on a page
			pageSize: {
				type: "int64"
			},
			// the offset in rows
			rowOffset: {
				type: "int64"
			},
			// total amount of rows available
			totalRowCount: {
				type: "int64"
			}
		}
	}, {
		title: "Get Paging",
		name: "get-paging",
		input: {},
		// the naming is not very clear, but at least it is inline with the backend...
		output: {
			// current page
			current: {
				type: "int64"
			},
			// the total amount of pages
			total: {
				type: "int64"
			},
			// how many items on a page
			pageSize: {
				type: "int64"
			},
			// the offset in rows
			rowOffset: {
				type: "int64"
			},
			// total amount of rows available
			totalRowCount: {
				type: "int64"
			}
		}
	}]
});
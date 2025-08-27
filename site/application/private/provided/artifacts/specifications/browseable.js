// unlike pageable where we know the amount of pages and can do random jumps
// with browseable we can only go forward and back a page
// when going forward we can choose to append the data (in a load-more scenario)
// they SHOULD return a promise simply to indicate when they are done (the actual value is undefined)
nabu.page.provide("page-specification", {
	name: "browseable",
	actions: [{
		title: "Next Page",
		name: "next-page",
		input: {
			append: {
				type: "boolean"
			}
		},
		output: {
			// can we go further?
			hasMore: {
				type: "boolean"
			}
		}
	}, {
		title: "Previous Page", 
		name: "previous-page",
		input: {},
		output: {
			// can we go back further?
			hasMore: {
				type: "boolean"
			}
		}
	}]
});
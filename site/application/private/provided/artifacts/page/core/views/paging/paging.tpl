<template id="page-paging">
	<n-paging :value="paging.current" :total="paging.total" :load="load" :initialize="false"
		:class="getChildComponentClasses('paging-menu')"
		:button-classes="getChildComponentClasses('paging-button')"
		:show-empty="edit"/>
</template>

<template id="page-paging-configure">
	<div class="is-column is-spacing-medium">
		<n-form-combo v-model="cell.state.target"
			label="Paging target"
			:filter="$services.page.getSpecificationTargets.bind($self, $services.page.getPageInstance(page, $self), 'pageable')"
			:formatter="function(x) { return x.name  ? x.name : (x.alias ? $services.page.prettifyRouteAlias(x.alias) : x.id) }"
			:extracter="function(x) { return x.id }"
			/>
	</div>
</template>
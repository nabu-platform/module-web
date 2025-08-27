<template id="page-paging-next">
	<ul class="is-menu" :class="getChildComponentClasses('paging-menu')">
		<li class="is-column"><button :class="getChildComponentClasses('paging-button')" class="is-button" @click="load(pageNumber - 1)" :disabled="pageNumber <= 0 || loading"><icon name="chevron-left"/></button></li>
		<li class="is-column"><n-form-text :value="pageNumber + 1" :minimum="1" :class="getChildComponentClasses('paging-page-number')" type="number" :disabled="loading" :timeout="600" @input="function(value) { load(Math.max(0, value - 1)) }"/></li>
		<li class="is-column"><button :class="getChildComponentClasses('paging-button')" class="is-button" @click="load(pageNumber + 1)" :disabled="loading"><icon name="chevron-right"/></button></li>
	</ul>
</template>

<template id="page-paging-next-configure">
	<div class="is-column is-spacing-medium">
		<n-form-combo v-model="cell.state.target"
			label="Paging target"
			:filter="$services.page.getSpecificationTargets.bind($self, $services.page.getPageInstance(page, $self), 'pageable')"
			:formatter="function(x) { return x.name  ? x.name : (x.alias ? $services.page.prettifyRouteAlias(x.alias) : x.id) }"
			:extracter="function(x) { return x.id }"
			/>
	</div>
</template>
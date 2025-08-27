<template id="page-button-sort">
	<button class="is-button" @click="handle($event)" :disabled="running || disabled" :class="[getChildComponentClasses('page-button-sort')]">
		<img :src="icon.indexOf('http') == 0 ? icon : $window.application.configuration.root + 'resources/' + icon" v-if="icon && icon.match(/^.*\.[^.]+$/)" class="is-icon"/>
		<icon :name="icon" v-if="icon"/>
		<span class="is-text" v-if="cell.state.content && !edit" v-html="$services.page.translate(getContentWithVariables($services.page.interpret(cell.state.content, $self)))"></span>
		<span class="is-text is-inline-editor" v-else-if="edit" 
			v-html-once="cell.state.content ? cell.state.content : null"
			ref="editor"
			@keyup="update" @blur="update" @input="update"
			:contenteditable="true"
			placeholder="Button label"></span>
		<span class="is-badge" v-if="cell.state.badge" v-html="cell.state.badge"></span>
	</button>
</template>

<template id="page-button-sort-configure">
	<div class="is-column">
		<div class="is-column is-spacing-medium">
			<n-form-combo v-model="cell.state.target"
				label="Sorting target"
				:filter="$services.page.getSpecificationTargets.bind($self, $services.page.getPageInstance(page, $self), 'orderable')"
				:formatter="function(x) { return x.name  ? x.name : (x.alias ? $services.page.prettifyRouteAlias(x.alias) : x.id) }"
				:extracter="function(x) { return x.id }"
				empty-value="No sorting targets available"
				/>
			
			<n-form-text v-model="cell.state.iconAsc" label="Icon when ascending" placeholder="sort-up"/>
			<n-form-text v-model="cell.state.iconDesc" label="Icon when descending" placeholder="sort-down"/>
			<n-form-switch v-model="cell.state.hideNoneIcon" label="Hide icon if no sorting is active"/>
			<n-form-switch v-model="cell.state.reverse" label="Reverse cycling, by default it is: asc, desc, none"/>
			<n-form-text v-if="!cell.state.hideNoneIcon" v-model="cell.state.iconNone" label="Icon when no sorting" placeholder="sort"/>
			<div v-for="(sortField, index) in cell.state.sortFields" class="has-button-close">
				<n-form-combo v-model="sortField.name" :filter="getAvailableFields" placeholder="Sort by"/>
				<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="cell.state.sortFields.splice(index, 1)"><icon name="times"/></button>
			</div>
			<div class="is-row is-align-end">
				<button @click="cell.state.sortFields.push({name:null, direction: null, nullsLast: null})" class="is-button is-size-small"><icon name="plus"/><span class="is-title">Order by</span></button>
			</div>
			<n-form-ace mode="javascript" v-model="cell.state.disabled" label="Disabled if"/>
			<n-form-ace mode="javascript" v-model="cell.state.active" label="Active if"/>
		</div>
		
		<typography-variable-replacer :content="cell.state.content" :container="cell.state" :page="page"/>
	</div>
</template>
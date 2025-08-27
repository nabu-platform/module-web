<template id="page-actions-configure">
	<div>
		<ul class="is-menu is-variant-toolbar is-align-end is-spacing-medium is-spacing-horizontal-gap-none">
			<li class="is-column" v-if="$services.page.isCopied('page-action')"><button class="is-button is-variant-warning is-size-xsmall" @click="paste"><span class="fa fa-paste"></span></button></li>
			<li class="is-column"><button class="is-button is-variant-primary is-size-xsmall" @click="addAction(false)"><icon name="plus"/>Static</button></li>
			<li class="is-column"><button class="is-button is-variant-primary-outline is-size-xsmall" @click="addAction(true)"><icon name="plus"/>Dynamic</button></li>
			<li class="is-column"><button class="is-button is-variant-primary-outline is-size-xsmall" @click="addContent()"><icon name="plus"/>Content</button></li>
		</ul>
		<n-collapsible :only-one-open="true" title="Generic Settings" v-if="!actions" content-class="is-spacing-medium">
			<n-form-combo v-model="cell.state.class" label="Class" 
				:filter="function(value) { return $services.page.classes('page-actions', value) }"/>
			<n-form-text v-model="cell.state.activeClass" label="Active Class" info="The class that is set on the active action, this defaults to 'is-active'" :timeout="600"/>
			<n-form-text v-model="cell.state.analysisId" label="Analysis Group" info="For analysis purposes we can group all the actions together" :timeout="600" />
			<n-form-combo v-model="cell.state.defaultAction" label="Default Action" info="The default action will be activated upon first creation. You must fill in the name of the action to select it."
				:filter="function() { return cell.state.actions.map(function(x) { return x.name }) }"/>
			<n-form-switch v-model="cell.state.useButtons" label="Use Buttons"/>
			<n-form-switch v-model="cell.state.isFixedHeader" label="Fix as header"/>
			<n-form-switch v-model="cell.state.showOnlyOne" label="Only allow one open" v-if="cell.state.clickBased"/>
			<n-form-switch v-model="cell.state.leaveOpen" label="Leave Open" v-if="cell.state.clickBased"/>
			<n-form-switch v-model="cell.state.autoActions" label="Automatically generate actions for all pages"/>
			<n-form-text v-model="cell.state.clickBased" label="Use Clicks Instead of Hover" info="You can set a condition that will be evaluated"/>
			<n-form-text v-model="cell.state.title" label="Title" after="Add a title to your menu"/>
			<n-form-text v-model="cell.state.logo" label="Logo URL" after="Configure the url for your logo"/>
			<page-event-value :page="page" :container="cell.state" title="Handled Event" name="handledEvent" @resetEvents="resetEvents" :inline="true"/>
		</n-collapsible>
		<n-collapsible :only-one-open="true" :title="action.label ? action.label : action.name" v-for="action in getAllActions()">
			<ul slot="buttons" class="is-menu is-variant-toolbar is-spacing-horizontal-right-medium">
				<li class="is-column"><button class="is-button is-size-xsmall is-variant-secondary-outline" @click="up(action)"><icon name="chevron-circle-up"/></button></li>
				<li class="is-column"><button class="is-button is-size-xsmall is-variant-secondary-outline" @click="down(action)"><icon name="chevron-circle-down"/></button></li>
				<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="$services.page.copyItem('page-action', action)"><icon name="copy"/></button></li>
				<li class="is-column"><button class="is-button is-size-xsmall is-variant-danger-outline" @click="getAllActions().splice(getAllActions().indexOf(action), 1)"><icon name="times"/></button></li>
			</ul>
			
			<div v-if="action.arbitrary" class="is-column is-spacing-medium">
				<page-configure-arbitrary v-if="action.arbitrary" 
					:page="page"
					:cell="cell"
					:target="action"
					:keys="$services.page.getAvailableParameters(page, cell)"/>
			</div>
			<div v-else class="is-column is-spacing-medium">
				<div v-if="action.dynamic" class="is-column is-spacing-vertical-gap-medium">
					<n-form-combo v-model="action.operation" label="Operation" :filter="getActionOperations"/>
					<n-page-mapper :to="getInputParameters(action)" 
						:from="$services.page.getAvailableParameters(page, cell, true)" 
						v-if="action.operation"
						v-model="action.bindings"/>
					<n-form-combo label="Label" v-if="action.operation" v-model="action.label" :filter="getOperationProperties.bind($self, action)"/>
					<n-form-combo label="Icon" v-if="action.operation" v-model="action.icon" :filter="getOperationProperties.bind($self, action)"/>
					<n-form-switch label="Autotrigger" v-model="action.autotrigger"/>
				</div>
				<div class="is-column is-spacing-vertical-gap-medium" v-else>
					<n-form-text v-model="action.label" label="Label" v-if="!action.compileLabel" :timeout="600"/>
					<n-form-ace mode="html" v-model="action.label" label="Label" v-else/>
					<n-form-switch v-model="action.compileLabel" label="Label as html"/>
					<n-form-text v-model="action.icon" label="Icon" :timeout="600"/>
					<n-form-switch v-model="action.iconReverse" label="Reverse icon order" v-if="action.icon"/>
					<n-form-text v-model="action.badge" label="Badge" :timeout="600" info="Use the = syntax to interpret the badge dynamically"/>
				</div>

				<n-form-text v-if="false" v-model="action.id" label="Id" :timeout="600" after="Set an id on this action, can be useful for analytics"/>
				<n-form-text v-model="action.name" label="Name" after="The name is used for analytics purposes, check the console to see how this works" :timeout="600"/>
				
				<n-form-switch v-model="action.close" label="Close" after="When this action is triggered, send a close event as well"/>
				<n-form-switch v-model="action.skipHandleEvent" label="Don't send handled event" v-if="$window.nabu.page.event.getName(cell.state, 'handledEvent')" after="If this action does not constitute the final user interaction, we don't want to send the handled event"/>
				
				<div v-if="!action.dynamic" class="is-column is-spacing-vertical-gap-medium">
					<n-form-combo v-model="action.route" v-if="(!action.event || !action.event.name) && !action.url" 
						:filter="$services.page.getPageRoutes" 
						:formatter="function(x) { return $services.page.prettifyRouteAlias(x.alias) }" 
						:extracter="function(x) { return x.alias }" 
						label="Route to page"/>
					<n-form-combo v-model="action.anchor" v-if="action.route || action.url" label="Anchor" :filter="function(value) { return value ? [value, '$blank', '$window'] : ['$blank', '$window'] }"/>
					<n-form-switch v-model="action.absolute" v-if="action.route && !cell.state.useButtons" label="Absolute"/>
					<n-form-switch v-model="action.mask" label="Mask" v-if="action.route"/>
					<n-form-text v-model="action.url" label="URL" v-if="!action.route && (!action.event || !action.event.name)" :timeout="600"/>
					<n-form-combo v-model="action.anchor" v-if="action.url" label="Anchor" :items="['$blank', '$window']"/>
					<n-page-mapper v-if="action.route && $services.router.get(action.route)" :to="$services.page.getRouteParameters($services.router.get(action.route))"
						:from="$services.page.getAvailableParameters(page, cell)" 
						v-model="action.bindings"/>
					<page-event-value :inline="true" class="no-more-padding" :page="page" :container="action" title="Action Event" v-if="!action.dynamic && !action.route && !action.url" name="event" 
					 	@updatedEvents="$updateEvents()"/>
					 	
					<n-form-ace mode="javascript" v-model="action.disabled" label="Disabled if"/>
					<n-form-ace mode="javascript" v-model="action.condition" label="Show if"/>
					<n-form-combo v-model="action.validate" label="Only if valid" :filter="validatableItems" info="This action is only triggerable if the indicated item or group of items is valid"/>
					<n-form-text info="The event to send out if we have a validation error" v-if="action.validate" v-model="action.validationErrorEvent" label="Validation Error Event" :timeout="600" />
					<n-form-switch info="Whether we want to scroll to the first exception" v-if="action.validate" v-model="action.validationErrorScroll" label="Scroll to Validation Error" />
				</div>
			</div>
			
			<p class="is-p is-size-small is-spacing-medium">Triggers allow you to fire an action when another event occurs. You can also control whether triggers should still fire even if the button is hidden.</p>
			<div class="is-row is-align-end is-spacing-medium" v-if="!action.arbitrary">
				<button class="is-button is-variant-primary is-size-xsmall" @click="action.triggers ? action.triggers.push('') : $window.Vue.set(action, 'triggers', [''])"><icon name="plus"/>Trigger</button>
			</div>
			<div v-if="action.triggers" class="is-column is-spacing-medium">
				<div class="is-column has-button-close" v-for="i in Object.keys(action.triggers)">
					<n-form-combo v-model="action.triggers[i]" :items="$window.Object.keys($services.page.getAllAvailableParameters(page))"/>
					<button class="is-button is-variant-close is-spacing-horizontal-right-large" @click="action.triggers.splice(i, 1)"><icon name="times"/></button>
				</div>
				<n-form-switch v-model="action.triggerIfHidden" v-if="action.triggers.length && action.condition" label="Allow trigger if hidden"/>
			</div>
			
			<p class="is-p is-size-small is-spacing-medium">When the action triggers a certain route, it is considered active. However, you may want to highlight it as active for other routes as well.</p>
			<div class="is-row is-align-end is-spacing-medium" v-if="!action.arbitrary">
				<button class="is-button is-variant-primary is-size-xsmall" @click="action.activeRoutes.push('')"><icon name="plus"/>Active Route</button>
			</div>
			<div class="is-column has-button-close is-spacing-medium" v-for="i in Object.keys(action.activeRoutes)">
				<div class="is-column has-button-close">
					<n-form-combo v-model="action.activeRoutes[i]"
						:filter="$services.page.getPageRoutes" 
						:formatter="function(x) { return $services.page.prettifyRouteAlias(x.alias) }" 
						:extracter="function(x) { return x.alias }" />
					<button class="is-button is-variant-close is-spacing-horizontal-right-large" @click="action.activeRoutes.splice(i, 1)"><icon name="times"/></button>
				</div>
			</div>
			
			<aris-editor v-if="!action.arbitrary && $services.page.useAris && $services.page.normalizeAris(page, action, 'action', getActionComponents(action))" :child-components="getActionComponents(action)" :container="action.aris"/>			
			<n-collapsible title="Custom classes" content-class="is-spacing-medium">
				<n-form-text v-model="action.class" label="Menu Entry Class" :timeout="600" after="Set a custom css class on the menu entry" />
				<n-form-text v-model="action.buttonClass" label="Button Class" :timeout="600" after="Set a custom css class on the button" />
				<div class="is-row is-align-end is-spacing-vertical-medium">
					<button class="is-button is-variant-primary is-size-xsmall" @click="addStyle(action)"><icon name="plus"/>Style</button>
				</div>
				<div v-if="action.styles" class="is-column is-spacing-vertical-gap-medium">
					<div v-for="style in action.styles" class="is-column has-button-close is-spacing-medium is-color-body">
						<n-form-text v-model="style.class" label="CSS Class"/>
						<n-form-text v-model="style.condition" label="Condition"/>
						<button class="is-button is-variant-close" @click="action.styles.splice(action.styles.indexOf(style), 1)"><icon name="times"/></button>
					</div>
				</div>
			</n-collapsible>
		</n-collapsible>
	</div>
</template>

<template id="page-actions">
	<ul :class="[cell.state.class, {'page-actions-root': actions == null }, {'page-actions-child': actions != null }, getAdditionalClasses(), {'is-empty-component': root && edit && (!cell.state.actions || !cell.state.actions.length)}]" 
			class="has-inline-component-menu"
			:placeholder="!actions || !actions.length ? 'Actions can be added here' : null"
			v-auto-close.actions="autoclose"
			v-fixed-header="cell.state.isFixedHeader != null && cell.state.isFixedHeader == true">
		<li class="is-column is-title" v-if="root && (cell.state.title || cell.state.logo)"><h2 class="is-h2" :class="getChildComponentClasses('actions-title')" @click="$services.router.route('home')"><img class="is-icon" v-if="cell.state.logo" :src="cell.state.logo"></span><span class="is-text" v-if="cell.state.title" v-html="$services.page.translate($services.page.interpret(cell.state.title, $self))"></span></h2></li>
		<li v-for="action in (isAutoCalculated ? autoActions : (edit ? getAllActions() : resolvedActions.filter(function(x) { return !x.dynamic})))" v-if="isVisible(action)"
				class="is-column"
				:class="[{ 'has-children': action.actions != null && action.actions.length }, action.class, {'click-based': cell.state.clickBased}, {'is-open': showing.indexOf(action) >= 0}, getDynamicWrapperClasses(action)]"
				@mouseover="show(action)" @mouseout="hide(action)"
				:sequence="(isAutoCalculated ? autoActions : (edit ? getAllActions() : resolvedActions)).indexOf(action) + 1">
			
			<n-sidebar class="page-settings" v-if="configuringAction" :inline="true" @close="configuringAction = null" :autocloseable="false">
				<component is="page-actions-configure" :cell="cell" :page="page" :edit="edit" :actions="configuringAction.actions"/>
			</n-sidebar>
			
			<page-arbitrary v-if="action.arbitrary"
				:edit="edit"
				:page="page"
				:cell="cell"
				:target="action"
				:component="$self"/>
			
			<template v-else>
				<span v-if="false && edit && !action.dynamic" class="fa fa-cog" @click="configureAction(action)"></span>
				<a :auto-close-actions="!action.skipHandleEvent" class="is-button" :href="getActionHref(action)"
					:data-event="action.name"
					:target="action.anchor == '$blank' && (action.url || action.route) ? '_blank' : null"
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getAllActions() : resolvedActions).indexOf(action) + 1"
					:disabled="isDisabled(action)"
					:id="$services.page.interpret(action.id, $self)"
					@click="handle(action)"
					v-if="!cell.state.useButtons && (action.route || hasEvent(action) || action.url || action.close)"
						><icon v-if="action.icon" :name="action.icon"
						/><span class="is-text" v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span></a>
				<button :auto-close-actions="!action.skipHandleEvent" class="is-button"
					:data-event="action.name"
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getAllActions() : resolvedActions).indexOf(action) + 1"
					:disabled="isDisabled(action)"
					:id="$services.page.interpret(action.id, $self)"
					@click="handle(action)" 
					v-else-if="cell.state.useButtons && (action.route || hasEvent(action) || action.url || action.close)"
						><icon v-if="action.icon" :name="action.icon"
						/><span class="is-text" v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span
						><span v-if="action.badge" v-html="$services.page.translate($services.page.interpret(action.badge, $self))" class="is-badge" :class="action.badgeVariant ? 'is-variant-' + action.badgeVariant : null"></span></button>
				<span class="is-label page-action-entry is-button" 
					@click="toggle(action)"
					v-else
					:class="getDynamicClasses(action)"
					:sequence="(edit ? getAllActions() : resolvedActions).indexOf(action) + 1"
						><icon v-if="action.icon" :name="action.icon"
						/><span class="is-text" v-content.parameterized="{value:$services.page.translate($services.page.interpret(action.label, $self)), sanitize:!action.compileLabel, compile: !!action.compileLabel, plain: !action.compileLabel }"></span></span>
				<page-actions :ref="'action_' + (edit ? getAllActions() : resolvedActions).indexOf(action)"
					:root="false"
					v-if="(action.actions && action.actions.length) || configuringAction == action"
					:cell="cell"
					:page="page"
					:parameters="parameters"
					:edit="edit"
					:local-state="localState"
					:child-components="childComponents"
					:actions="action.actions"
					@close="$emit('close')"
					v-show="(edit && false) || showing.indexOf(action) >= 0"/>
			</template>
		</li>
		<ul v-if="root && edit" class="is-menu is-variant-toolbar is-variant-inline-component-menu">
			<li class="is-column"><button class="is-button is-variant-primary is-size-xsmall" @click="addAction(false);"><icon name="plus"/><span class="is-text">Static</span></button></li>
			<li class="is-column"><button class="is-button is-variant-secondary is-size-xsmall" @click="addAction(true);configure()"><icon name="plus"/><span class="is-text">Dynamic</span></button></li>
		</ul>
	</ul>
</template>
